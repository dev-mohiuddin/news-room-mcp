import { logger } from "#utils/logger.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  ARTICLE_STATUS,
  FAILURE_REASONS,
} from "#constants/articleStatus.js";
import {
  findActiveArticleById,
  claimPublish,
  transitionStatus,
  markFailed,
  updateArticleFields,
} from "#repositories/articleRepository.js";
import { getCredentialsForPublish } from "#services/cms/cmsConnectionService.js";
import {
  createPost,
  findOrCreateTaxonomy,
} from "#services/external/wordpressClient.js";
import {
  enqueueScheduledPublish,
} from "#queues/scheduledPublishQueue.js";

/**
 * ============================================================
 *  Publish stage — Requirement 9
 * ============================================================
 *
 *  Sequence:
 *   1. Idempotent short-circuit — return existing cmsPostId if non-null
 *   2. Atomic CAS publish claim (status = draft_ready → publishing)
 *   3. Resolve credentials, find-or-create tags/categories
 *   4. POST /wp-json/wp/v2/posts (status defaults to "draft")
 *   5. Persist cmsPostId, cmsPostUrl, publishedAt, transition → published
 *   6. On error: transition → failed, reason CMS_PUBLISH_FAILED
 *
 *  Auto-publish vs. schedule require TENANT_ARTICLE_APPROVE (route layer).
 */

const buildPostPayload = ({
  article,
  mode,
  tagIds,
  categoryIds,
  featuredMediaId,
}) => {
  // Two modes reach this builder: `draft` and `publish`. The `schedule`
  // path is short-circuited earlier by the caller.
  const status = mode === "publish" ? "publish" : "draft";

  return {
    status,
    title: article.seo?.metaTitle || article.topic,
    content: article.contentHtml,
    excerpt: article.seo?.metaDescription || "",
    slug: article.seo?.slug || undefined,
    tags: tagIds || [],
    categories: categoryIds || [],
    ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
    meta: {
      ogTitle: article.seo?.ogTitle || null,
      ogDescription: article.seo?.ogDescription || null,
    },
  };
};

const resolveMode = ({ requestBody, hasApprove }) => {
  if (requestBody?.scheduledAt) {
    if (!hasApprove) {
      throwError("Scheduling requires approval permission", 403);
    }
    const when = new Date(requestBody.scheduledAt);
    if (!(when.getTime() > Date.now())) {
      throwError("Scheduled time must be in the future", 400);
    }
    return { mode: "schedule", scheduledAt: when };
  }
  if (requestBody?.confirmAutoPublish === true && hasApprove) {
    return { mode: "publish" };
  }
  return { mode: "draft" };
};

export const publishArticle = async ({
  workspaceId,
  actor,
  articleId,
  cmsConnectionId,
  requestBody,
  permissions,
  req,
}) => {
  const article = await findActiveArticleById(workspaceId, articleId);
  if (!article) throwError("Article not found", 404);

  /* 1. Idempotent short-circuit */
  if (article.cmsPostId) {
    return {
      idempotent: true,
      cmsPostId: article.cmsPostId,
      cmsPostUrl: article.cmsPostUrl,
      article,
    };
  }

  if (article.status !== ARTICLE_STATUS.DRAFT_READY) {
    throwError(
      `Cannot publish article in status '${article.status}'`,
      409
    );
  }

  if (!cmsConnectionId) {
    throwError("cmsConnectionId is required to publish", 400);
  }

  const hasApprove = (permissions || []).some(
    (p) => p === "*" || p === "tenant.article:approve"
  );
  const { mode, scheduledAt } = resolveMode({ requestBody, hasApprove });

  /* ──────────────────────────────────────────────────────────
   *  Schedule path — do NOT hit WordPress yet.
   *  The article is parked in `scheduled` status with a delayed
   *  BullMQ job. When the job fires, the scheduledPublishWorker
   *  hops scheduled → draft_ready and re-enters this function in
   *  `publish` mode, which goes through the real CAS + WP create.
   * ────────────────────────────────────────────────────────── */
  if (mode === "schedule") {
    const updated = await transitionStatus({
      workspaceId,
      articleId,
      from: ARTICLE_STATUS.DRAFT_READY,
      to: ARTICLE_STATUS.SCHEDULED,
      reason: "schedule:set",
      set: {
        cmsConnectionId,
        scheduledAt,
      },
    });

    let scheduledJobId = null;
    try {
      scheduledJobId = await enqueueScheduledPublish({
        articleId,
        workspaceId,
        cmsConnectionId,
        runAt: scheduledAt,
      });
    } catch (err) {
      // Roll back the status change so the user can retry.
      logger.error("[publish] schedule enqueue failed; reverting", {
        message: err.message,
      });
      try {
        await transitionStatus({
          workspaceId,
          articleId,
          from: ARTICLE_STATUS.SCHEDULED,
          to: ARTICLE_STATUS.DRAFT_READY,
          reason: "schedule:enqueue_failed",
        });
      } catch (revertErr) {
        logger.error("[publish] schedule revert failed", {
          message: revertErr.message,
        });
      }
      throwError("Could not schedule publish. Please try again.", 503);
    }

    if (scheduledJobId) {
      await updateArticleFields(workspaceId, articleId, {
        jobId: String(scheduledJobId),
      });
    }

    await logAudit({
      actor,
      category: "content",
      action: "article.scheduled",
      entityType: "article",
      entityId: articleId,
      workspaceId,
      after: {
        scheduledAt: scheduledAt.toISOString(),
        cmsConnectionId,
      },
      req,
    });

    return {
      idempotent: false,
      scheduled: true,
      scheduledAt,
      cmsPostId: null,
      cmsPostUrl: null,
      article: updated,
    };
  }

  /* 2. Atomic CAS claim */
  const claimed = await claimPublish(workspaceId, articleId);
  if (!claimed) {
    throwError(
      "Could not acquire publish claim (status changed concurrently)",
      409
    );
  }

  /* 3. Credentials + taxonomy resolution */
  let creds;
  try {
    creds = await getCredentialsForPublish(workspaceId, cmsConnectionId);
  } catch (err) {
    await markFailed({
      workspaceId,
      articleId,
      from: ARTICLE_STATUS.PUBLISHING,
      reason: FAILURE_REASONS.CMS_PUBLISH_FAILED,
    });
    throw err;
  }

  let tagIds = [];
  try {
    tagIds = await findOrCreateTaxonomy(creds, "tags", article.seo?.tags || []);
  } catch (err) {
    logger.warn("[publish] tag resolution failed; continuing without tags", {
      message: err.message,
    });
  }

  /* 4. Create the WP post */
  let wpPost;
  try {
    wpPost = await createPost({
      creds,
      payload: buildPostPayload({
        article,
        mode,
        tagIds,
        categoryIds: [],
        featuredMediaId: null, // image flow lands in a follow-up turn
      }),
    });
  } catch (err) {
    logger.error("[publish] WP create failed", { message: err.message });
    await markFailed({
      workspaceId,
      articleId,
      from: ARTICLE_STATUS.PUBLISHING,
      reason: FAILURE_REASONS.CMS_PUBLISH_FAILED,
    });
    await logAudit({
      actor,
      category: "content",
      action: "article.publish_failed",
      entityType: "article",
      entityId: articleId,
      workspaceId,
      status: "error",
      metadata: { message: err.message },
      req,
    });
    throwError(`WordPress publish failed: ${err.message}`, 502);
  }

  /* 5. Persist + transition → published */
  const updated = await transitionStatus({
    workspaceId,
    articleId,
    from: ARTICLE_STATUS.PUBLISHING,
    to: ARTICLE_STATUS.PUBLISHED,
    reason: `cms:wordpress:${mode}`,
    set: {
      cmsConnectionId,
      cmsPostId: String(wpPost.id),
      cmsPostUrl: wpPost.link || null,
      publishedAt: new Date(),
    },
  });

  await logAudit({
    actor,
    category: "content",
    action: "article.published",
    entityType: "article",
    entityId: articleId,
    workspaceId,
    after: { mode, cmsPostId: wpPost.id },
    req,
  });

  return {
    idempotent: false,
    cmsPostId: String(wpPost.id),
    cmsPostUrl: wpPost.link || null,
    article: updated,
  };
};
