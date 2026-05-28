import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logger } from "#utils/logger.js";
import { sanitizeArticleHtml } from "#utils/htmlSanitizer.js";
import { htmlToPlain, wordCount as countWords } from "#utils/textUtil.js";
import {
  paginatedArticles,
  findActiveArticleById,
  findArticleById,
  createArticle,
  updateArticleFields,
  softDeleteArticle,
  restoreArticle,
  transitionStatus,
  forceMarkFailed,
} from "#repositories/articleRepository.js";
import { findBriefByArticleId } from "#repositories/researchBriefRepository.js";
import { ARTICLE_STATUS } from "#constants/articleStatus.js";
import * as quotaService from "#services/billing/quotaService.js";
import {
  enqueueArticleGeneration,
  cancelArticleGeneration,
} from "#queues/articleQueue.js";
import { cancelScheduledPublish } from "#queues/scheduledPublishQueue.js";
import { publishArticle as publishArticleService } from "#services/article/publishService.js";
import { logAudit } from "#utils/auditLogger.js";
import { isRedisAvailable } from "#config/redisConfig.js";

/**
 * ============================================================
 *  Article controllers
 * ============================================================
 *
 *  POST   /api/v1/articles/generate           → 202 Accepted, enqueue
 *  GET    /api/v1/articles                    → paginated list
 *  GET    /api/v1/articles/:id                → article + brief
 *  PATCH  /api/v1/articles/:id                → editable fields only
 *  DELETE /api/v1/articles/:id                → soft delete
 *  POST   /api/v1/articles/:id/publish        → publish to CMS
 *  POST   /api/v1/articles/:id/restore        → restore soft-deleted (Owner)
 */

const LOCKED_STATUSES = new Set([
  ARTICLE_STATUS.RESEARCHING,
  ARTICLE_STATUS.OUTLINING,
  ARTICLE_STATUS.DRAFTING,
  ARTICLE_STATUS.SEO_OPTIMIZING,
  ARTICLE_STATUS.ORIGINALITY_CHECKING,
  ARTICLE_STATUS.PUBLISHING,
]);

/* POST /generate */
export const generateArticle = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const { topic, targetKeyword, tone, targetWordCount, additionalKeywords } = req.body;

  /* 0. Pre-flight queue check — fail fast BEFORE we touch the DB.
   *    Without this, a Redis-down environment would create an orphan
   *    article doc + a quota increment, then refund the quota on the
   *    enqueue failure. The orphan article would still pollute every
   *    analytics query (admin dashboard, user nav badge, etc.). */
  if (!isRedisAvailable()) {
    throwError(
      "Article generation is temporarily unavailable. Please try again in a moment.",
      503,
      { code: "QUEUE_UNAVAILABLE" }
    );
  }

  // 1. Quota check + atomic reservation
  await quotaService.checkAndReserve(workspaceId);

  // 2. Persist Article doc
  const article = await createArticle(workspaceId, {
    createdBy: userId,
    topic,
    targetKeyword,
    tone: tone || "Professional",
    targetWordCount: targetWordCount || 1500,
    additionalKeywords: additionalKeywords || [],
    status: ARTICLE_STATUS.DRAFT,
    quotaIncrementApplied: true,
  });

  // 3. Enqueue
  let jobId = null;
  try {
    jobId = await enqueueArticleGeneration({
      articleId: article._id,
      workspaceId,
      userId,
    });
    if (jobId) {
      await updateArticleFields(workspaceId, article._id, { jobId: String(jobId) });
    }
  } catch (err) {
    /* Race condition: queue went down between our pre-flight check and
     * the actual enqueue. Roll back BOTH the article doc (soft-delete so
     * analytics stops counting it) AND the quota slot. */
    logger.error("[articles] enqueue failed; rolling back article + quota", {
      message: err.message,
      articleId: String(article._id),
    });
    await softDeleteArticle(workspaceId, article._id).catch((rollbackErr) =>
      logger.error("[articles] rollback soft-delete failed", {
        message: rollbackErr.message,
      })
    );
    await quotaService.refund(workspaceId).catch((refundErr) =>
      logger.error("[articles] rollback quota refund failed", {
        message: refundErr.message,
      })
    );
    throwError("Article queue unavailable", 503, { code: "QUEUE_UNAVAILABLE" });
  }

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.generate_enqueued",
    entityType: "article",
    entityId: article._id,
    workspaceId,
    after: { topic, targetKeyword, tone, targetWordCount, jobId },
    req,
  });

  res.success({
    statusCode: 202,
    message: "Article generation started",
    data: {
      articleId: article._id,
      jobId,
      status: article.status,
    },
  });
});

/* GET / */
export const listArticles = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const params = parsePaginationParams(req, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["createdAt", "wordCount", "status"],
  });
  const filters = {
    status: req.query.status || undefined,
    tag: req.query.tag || undefined,
    dateFrom: req.query.dateFrom || undefined,
    dateTo: req.query.dateTo || undefined,
  };
  const { items, meta } = await paginatedArticles(workspaceId, params, filters);
  res.success({
    data: items,
    pagination: meta,
    message: "Articles fetched",
  });
});

/* GET /:id */
export const getArticle = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);
  const brief = await findBriefByArticleId(workspaceId, article._id);
  res.success({ data: { article, brief }, message: "Article fetched" });
});

/* PATCH /:id */
export const updateArticle = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);

  if (LOCKED_STATUSES.has(article.status)) {
    throwError("Article is locked while generating", 409);
  }
  if (![ARTICLE_STATUS.DRAFT_READY, ARTICLE_STATUS.NEEDS_REVISION].includes(article.status)) {
    throwError("Article is not editable in its current status", 409);
  }

  // Writer can only edit their own articles (Req 18.6)
  if (req.user.role === "writer" && String(article.createdBy) !== String(userId)) {
    throwError("Writers can only edit their own articles", 403);
  }

  // Sanitize incoming HTML + recompute word/reading counts so the UI
  // stays in sync with what was just saved.
  const updates = { ...req.body };
  if (typeof updates.contentHtml === "string") {
    updates.contentHtml = sanitizeArticleHtml(updates.contentHtml);
    const plain = htmlToPlain(updates.contentHtml);
    updates.wordCount = countWords(plain);
    updates.readingTimeMinutes = Math.max(
      1,
      Math.round(updates.wordCount / 220)
    );
  }

  const updated = await updateArticleFields(workspaceId, article._id, updates);
  res.success({ data: updated, message: "Article updated" });
});

/* DELETE /:id */
export const deleteArticle = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);

  if (req.user.role === "writer" && String(article.createdBy) !== String(userId)) {
    throwError("Writers can only delete their own articles", 403);
  }

  const removed = await softDeleteArticle(workspaceId, req.params.id);
  if (!removed) throwError("Article not found", 404);

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.deleted",
    entityType: "article",
    entityId: removed._id,
    workspaceId,
    req,
  });

  res.status(204).end();
});

/* POST /:id/restore */
export const restoreArticleHandler = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  if (req.user.role !== "workspace_owner" && !req.user.permissions?.includes("*")) {
    throwError("Only the workspace owner can restore deleted articles", 403);
  }
  const article = await findArticleById(workspaceId, req.params.id, {
    includeDeleted: true,
  });
  if (!article) throwError("Article not found", 404);
  if (!article.deletedAt) throwError("Article is not deleted", 404);

  const ageMs = Date.now() - new Date(article.deletedAt).getTime();
  if (ageMs > 30 * 24 * 60 * 60 * 1000) {
    throwError("Restore window has expired", 410);
  }

  const restored = await restoreArticle(workspaceId, req.params.id);
  res.success({ data: restored, message: "Article restored" });
});

/* POST /:id/publish */
export const publishArticleHandler = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const result = await publishArticleService({
    workspaceId,
    actor: req.user,
    articleId: req.params.id,
    cmsConnectionId: req.body.cmsConnectionId,
    requestBody: req.body,
    permissions: req.user.permissions || [],
    req,
  });
  res.success({
    data: result,
    message: result.idempotent
      ? "Article already published"
      : "Article published",
  });
});

/* GET /quota */
export const getQuota = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const snapshot = await quotaService.getQuotaSnapshot(workspaceId);
  res.success({ data: snapshot, message: "Quota fetched" });
});

/* POST /:id/retry — re-run pipeline for `needs_revision` articles */
export const retryArticleHandler = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);

  if (article.status !== ARTICLE_STATUS.NEEDS_REVISION) {
    throwError(
      "Only articles in needs_revision can be retried",
      409
    );
  }

  if (req.user.role === "writer" && String(article.createdBy) !== String(userId)) {
    throwError("Writers can only retry their own articles", 403);
  }

  /* Pre-flight queue check — avoids leaving the article in DRAFT
   * status with no job behind it (pipeline would never resume). */
  if (!isRedisAvailable()) {
    throwError(
      "Article generation is temporarily unavailable. Please try again in a moment.",
      503,
      { code: "QUEUE_UNAVAILABLE" }
    );
  }

  // Atomic CAS: needs_revision → draft. The pipeline always starts from
  // draft and re-runs every stage cleanly, which is the safest reset.
  await transitionStatus({
    workspaceId,
    articleId: article._id,
    from: ARTICLE_STATUS.NEEDS_REVISION,
    to: ARTICLE_STATUS.DRAFT,
    reason: "manual:retry",
    set: { failureReason: null },
  });

  // Enqueue a fresh BullMQ job — the worker resumes at draft and walks
  // the full chain.
  let jobId = null;
  try {
    jobId = await enqueueArticleGeneration({
      articleId: article._id,
      workspaceId,
      userId,
    });
    if (jobId) {
      await updateArticleFields(workspaceId, article._id, {
        jobId: String(jobId),
      });
    }
  } catch (err) {
    /* Race: queue went down after pre-flight. Roll back the article to
     * needs_revision so it stays consistent (it was needs_revision on
     * entry, we just flipped it to draft + failed to enqueue). */
    logger.error("[articles] retry enqueue failed; reverting to needs_revision", {
      message: err.message,
      articleId: String(article._id),
    });
    await transitionStatus({
      workspaceId,
      articleId: article._id,
      from: ARTICLE_STATUS.DRAFT,
      to: ARTICLE_STATUS.NEEDS_REVISION,
      reason: "queue_unavailable",
    }).catch(() => {});
    throwError("Article queue unavailable", 503, { code: "QUEUE_UNAVAILABLE" });
  }

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.retry",
    entityType: "article",
    entityId: article._id,
    workspaceId,
    after: { jobId },
    req,
  });

  res.success({
    statusCode: 202,
    message: "Article retry started",
    data: { articleId: article._id, jobId, status: ARTICLE_STATUS.DRAFT },
  });
});

/* POST /:id/cancel — abort an in-flight pipeline run or unschedule */
const CANCELLABLE = new Set([
  ARTICLE_STATUS.DRAFT,
  ARTICLE_STATUS.RESEARCHING,
  ARTICLE_STATUS.OUTLINING,
  ARTICLE_STATUS.DRAFTING,
  ARTICLE_STATUS.SEO_OPTIMIZING,
  ARTICLE_STATUS.ORIGINALITY_CHECKING,
  ARTICLE_STATUS.SCHEDULED,
]);

export const cancelArticleHandler = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);

  if (req.user.role === "writer" && String(article.createdBy) !== String(userId)) {
    throwError("Writers can only cancel their own articles", 403);
  }

  if (!CANCELLABLE.has(article.status)) {
    throwError("Article is not in a cancellable state", 409);
  }

  /* ── Scheduled article? Just unschedule it cleanly back to draft_ready. ── */
  if (article.status === ARTICLE_STATUS.SCHEDULED) {
    try {
      await cancelScheduledPublish({
        jobId: article.jobId,
        articleId: article._id,
      });
    } catch (err) {
      logger.warn("[articles] cancel: scheduled-publish remove failed", {
        articleId: String(article._id),
        message: err.message,
      });
    }

    const reverted = await transitionStatus({
      workspaceId,
      articleId: article._id,
      from: ARTICLE_STATUS.SCHEDULED,
      to: ARTICLE_STATUS.DRAFT_READY,
      reason: "manual:unschedule",
      set: { scheduledAt: null, jobId: null },
    });

    await logAudit({
      actor: req.user,
      category: "content",
      action: "article.unscheduled",
      entityType: "article",
      entityId: article._id,
      workspaceId,
      before: { status: article.status, scheduledAt: article.scheduledAt },
      after: { status: reverted.status },
      req,
    });

    return res.success({
      data: { articleId: article._id, status: reverted.status },
      message: "Schedule cancelled",
    });
  }

  // Best-effort: remove the BullMQ generation job. The worker may still
  // complete the current stage, but the pipeline will not advance because
  // we transition the article into `failed` immediately.
  try {
    await cancelArticleGeneration({
      jobId: article.jobId,
      articleId: article._id,
    });
  } catch (err) {
    logger.warn("[articles] cancel: queue cancel failed (non-fatal)", {
      articleId: String(article._id),
      message: err.message,
    });
  }

  // Force-transition to FAILED, writing a status-history entry. The repo
  // helper bypasses the strict CAS table because manual cancel can target
  // any active stage, not just the ones with `<stage> → failed` edges.
  const targetReason = "MANUAL_CANCEL";
  await forceMarkFailed(workspaceId, article._id, targetReason);

  // Refund the quota slot reserved on submit.
  if (!article.quotaRefunded) {
    try {
      await quotaService.refund(workspaceId);
      await updateArticleFields(workspaceId, article._id, { quotaRefunded: true });
    } catch (err) {
      logger.warn("[articles] cancel: quota refund failed", { message: err.message });
    }
  }

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.cancel",
    entityType: "article",
    entityId: article._id,
    workspaceId,
    before: { status: article.status },
    after: { status: ARTICLE_STATUS.FAILED, reason: targetReason },
    req,
  });

  res.success({
    data: { articleId: article._id, status: ARTICLE_STATUS.FAILED },
    message: "Generation cancelled",
  });
});

/* POST /:id/duplicate — clone the article as a fresh draft */
export const duplicateArticleHandler = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);

  // Reserve a quota slot — the copy counts toward the user's plan because
  // it CAN be re-generated/published just like a fresh draft.
  await quotaService.checkAndReserve(workspaceId);

  // Build a stripped-down copy. We deliberately drop:
  //  - cmsPostId / cmsPostUrl / publishedAt   (would let user double-publish the same WP post)
  //  - moderation flags                        (start fresh on a new article)
  //  - statusHistory                           (each article owns its own history)
  //  - originality.revisionAttempt counter     (3-strike rule resets)
  //  - costs                                   (new article = new cost ledger)
  //  - jobId / scheduledAt                     (no inherited schedule)
  //  - seo.slug                                (slug must be unique per workspace)
  const sourcePlain = article.toObject({ depopulate: true });
  const copyTitle = `${(article.seo?.metaTitle || article.topic || "Untitled").slice(0, 160)} (copy)`;

  const payload = {
    createdBy: userId,
    topic: article.topic,
    targetKeyword: article.targetKeyword,
    additionalKeywords: article.additionalKeywords || [],
    tone: article.tone || "Professional",
    targetWordCount: article.targetWordCount || 1500,
    status: ARTICLE_STATUS.DRAFT_READY,
    quotaIncrementApplied: true,

    /* Preserve the actual content + research */
    researchBriefId: article.researchBriefId || null,
    outline: sourcePlain.outline || [],
    paragraphs: sourcePlain.paragraphs || [],
    sourcesIndex: sourcePlain.sourcesIndex || [],
    contentHtml: article.contentHtml || "",
    contentMarkdown: article.contentMarkdown || "",
    wordCount: article.wordCount || 0,
    readingTimeMinutes: article.readingTimeMinutes || 0,

    seo: {
      ...(sourcePlain.seo || {}),
      metaTitle: copyTitle,
      // slug intentionally unset — uniqueness across workspace required
      slug: null,
    },
    featuredImage: sourcePlain.featuredImage || null,

    /* Phase B fields are user-facing artifacts; keep them */
    audience: sourcePlain.audience || null,
    factCheck: sourcePlain.factCheck || null,
    aiCitation: sourcePlain.aiCitation || null,
    socialPosts: sourcePlain.socialPosts || null,

    /* History entry signaling the duplication */
    statusHistory: [
      {
        from: "draft",
        to: ARTICLE_STATUS.DRAFT_READY,
        at: new Date(),
        reason: `duplicated:from:${article._id}`,
      },
    ],
  };

  let created;
  try {
    created = await createArticle(workspaceId, payload);
  } catch (err) {
    // Roll back the quota slot we just reserved.
    await quotaService.refund(workspaceId).catch(() => {});
    throw err;
  }

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.duplicated",
    entityType: "article",
    entityId: created._id,
    workspaceId,
    after: { sourceId: article._id, copyId: created._id },
    req,
  });

  res.success({
    statusCode: 201,
    data: created,
    message: "Article duplicated",
  });
});
export const exportArticleHandler = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);
  if (
    ![
      ARTICLE_STATUS.DRAFT_READY,
      ARTICLE_STATUS.PUBLISHED,
      ARTICLE_STATUS.NEEDS_REVISION,
    ].includes(article.status)
  ) {
    throwError("Article must be drafted before export", 409);
  }

  const format = String(req.query.format || "markdown").toLowerCase();
  const baseSlug =
    article.seo?.slug || article.targetKeyword || `article-${article._id}`;
  const safeSlug = baseSlug.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  const title =
    article.seo?.metaTitle || article.topic || "Untitled article";

  if (format === "html") {
    const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(article.seo?.metaDescription || "")}" />
</head>
<body>
<article>
<h1>${escapeHtml(title)}</h1>
${article.contentHtml || ""}
</article>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeSlug}.html"`
    );
    return res.send(body);
  }

  if (format === "json") {
    const payload = {
      id: article._id,
      topic: article.topic,
      targetKeyword: article.targetKeyword,
      status: article.status,
      title,
      seo: article.seo,
      content: {
        html: article.contentHtml,
        markdown: article.contentMarkdown,
      },
      featuredImage: article.featuredImage,
      sourcesIndex: article.sourcesIndex,
      audience: article.audience,
      factCheck: article.factCheck,
      aiCitation: article.aiCitation,
      socialPosts: article.socialPosts,
      wordCount: article.wordCount,
      readingTimeMinutes: article.readingTimeMinutes,
      createdAt: article.createdAt,
      publishedAt: article.publishedAt,
    };
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeSlug}.json"`
    );
    return res.send(JSON.stringify(payload, null, 2));
  }

  // markdown (default)
  const md = buildMarkdownExport(article, title);
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeSlug}.md"`
  );
  return res.send(md);
});

/* Helpers — kept inline to avoid one-off util files */
const escapeHtml = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildMarkdownExport = (article, title) => {
  const parts = [];
  parts.push(`# ${title}\n`);
  if (article.seo?.metaDescription) {
    parts.push(`> ${article.seo.metaDescription}\n`);
  }
  if (article.contentMarkdown) {
    parts.push(article.contentMarkdown);
  } else if (article.contentHtml) {
    parts.push(article.contentHtml);
  }
  if (article.sourcesIndex?.length) {
    parts.push(`\n## Sources\n`);
    article.sourcesIndex.forEach((s) => {
      parts.push(`${s.numeral}. ${s.url}`);
    });
  }
  return parts.join("\n");
};
