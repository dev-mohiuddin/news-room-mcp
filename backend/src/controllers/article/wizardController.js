import { catchAsync } from "#utils/catchAsync.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logger } from "#utils/logger.js";
import { logAudit } from "#utils/auditLogger.js";
import { isRedisAvailable } from "#config/redisConfig.js";
import {
  findActiveArticleById,
  createArticle,
  updateArticleFields,
  softDeleteArticle,
} from "#repositories/articleRepository.js";
import {
  findBriefByArticleId,
  upsertBriefForArticle,
} from "#repositories/researchBriefRepository.js";
import {
  ensureStagesArray,
  transitionStage,
  cascadeClearOnRegenerate,
  buildPendingStages,
  getStageRecord,
} from "#repositories/wizardStageRepository.js";
import {
  enqueueStageJob,
} from "#queues/wizardStageQueue.js";
import {
  ARTICLE_STATUS,
  STAGE_NAMES,
  STAGE_STATUS,
  STAGE_RETRY_LIMIT,
  FAILURE_REASONS,
} from "#constants/articleStatus.js";
import { readChunksSince, createStreamPublisher } from "#services/article/streamPublisher.js";
import { summarizeSourcesAsBrief } from "#services/article/researchService.js";
import { enrichSelectedSources } from "#services/article/sourceEnrichmentService.js";
import { prepareOutlineContext } from "#services/article/outlineEnricherService.js";
import {
  isFlagEnabled,
  HLP_SOURCE_ENRICH_ENABLED,
  HLP_OUTLINE_ENRICH_ENABLED,
} from "#utils/featureFlags.js";
import * as quotaService from "#services/billing/quotaService.js";

/**
 * ============================================================
 *  Wizard Controller — Requirements 1, 2, 3, 5, 7, 8, 9, 12, 14–16
 * ============================================================
 *
 *  All handlers:
 *    - Run after `protect` + `tenantScope` + `requirePermission` middleware
 *    - Use `req.tenant.workspaceId` for scoping; cross-workspace access
 *      returns 404 to avoid existence-leak
 *    - Use `req.tenant.userId` for actor attribution
 *    - Mutation handlers write a `logAudit({...})` entry per Req 15
 *
 *  Authorization specifics:
 *    - workspace_owner / editor: any article in the workspace
 *    - writer: only articles where `createdBy === userId`
 *    - viewer: read-only — only `getStageChunks` is allowed
 *    Insufficient role on an in-workspace article also returns 404
 *    (matches the existing articleController.js policy).
 */

/* ──────────────────────────────────────────────────────────
 *  Authorization helper — single source of truth for the
 *  404-not-403 policy.
 * ────────────────────────────────────────────────────────── */
const loadAuthorizedArticle = async ({ req, mode = "read" }) => {
  const { workspaceId, userId } = req.tenant;
  const article = await findActiveArticleById(workspaceId, req.params.id);
  if (!article) throwError("Article not found", 404);

  const role = req.user.role;
  // viewer can only read; never mutate
  if (mode !== "read" && role === "viewer") {
    throwError("Article not found", 404);
  }
  // writer can only act on their own articles
  if (role === "writer" && String(article.createdBy) !== String(userId)) {
    throwError("Article not found", 404);
  }
  return article;
};

const ensureQueueAvailable = () => {
  if (!isRedisAvailable()) {
    throwError(
      "Article generation is temporarily unavailable. Please try again in a moment.",
      503,
      { code: "QUEUE_UNAVAILABLE" }
    );
  }
};

/* ──────────────────────────────────────────────────────────
 *  POST /articles/wizard/start
 *  Reserves a quota slot, creates a wizard-mode article with
 *  five `pending` stages, returns the new articleId.
 * ────────────────────────────────────────────────────────── */
export const startWizardArticle = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const {
    topic,
    targetKeyword,
    tone,
    targetWordCount,
    additionalKeywords,
    brandVoiceProfileId,
    templateId,
  } = req.body;

  ensureQueueAvailable();

  /* Resolve and validate optional template — any unknown id is rejected
     so the article doc never carries a dangling reference. Apply preset
     fields onto the new article in deterministic precedence:
       explicit body field > template field > schema default. */
  let templatePreset = null;
  if (templateId) {
    const tpl = await import("#repositories/templateRepository.js").then((m) =>
      m.findTemplateById(workspaceId, templateId).catch(() => null)
    );
    if (!tpl) throwError("Template not found", 404);
    templatePreset = tpl;
  }

  /* Resolve and validate optional brand voice — same idea. */
  if (brandVoiceProfileId) {
    const profile = await import("#repositories/brandVoiceRepository.js").then(
      (m) => m.findProfileById(workspaceId, brandVoiceProfileId).catch(() => null)
    );
    if (!profile) throwError("Brand voice profile not found", 404);
  }

  await quotaService.checkAndReserve(workspaceId);

  const resolvedTone =
    tone || templatePreset?.tonePreset || "Professional";
  const resolvedWordCount =
    targetWordCount || templatePreset?.targetWordCount || 1500;
  const resolvedKeywords = Array.isArray(additionalKeywords) && additionalKeywords.length
    ? additionalKeywords
    : Array.isArray(templatePreset?.additionalKeywords)
      ? templatePreset.additionalKeywords
      : [];
  const resolvedVoice =
    brandVoiceProfileId || templatePreset?.brandVoiceProfileId || null;
  const resolvedOutline =
    Array.isArray(templatePreset?.outlinePreset) && templatePreset.outlinePreset.length
      ? templatePreset.outlinePreset
      : [];

  let article;
  try {
    article = await createArticle(workspaceId, {
      createdBy: userId,
      topic,
      targetKeyword,
      tone: resolvedTone,
      targetWordCount: resolvedWordCount,
      additionalKeywords: resolvedKeywords,
      brandVoiceProfileId: resolvedVoice,
      templateId: templateId || null,
      outline: resolvedOutline,
      status: ARTICLE_STATUS.DRAFT,
      quotaIncrementApplied: true,
      wizardMode: true,
      stages: buildPendingStages(),
    });
    if (templateId) {
      // Best-effort use counter — non-blocking.
      import("#services/article/templateService.js")
        .then((m) => m.useTemplate({ workspaceId, id: templateId }))
        .catch(() => {});
    }
  } catch (err) {
    await quotaService.refund(workspaceId).catch(() => {});
    throw err;
  }

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.wizard_started",
    entityType: "article",
    entityId: article._id,
    workspaceId,
    after: {
      topic,
      targetKeyword,
      tone: resolvedTone,
      targetWordCount: resolvedWordCount,
      brandVoiceProfileId: resolvedVoice,
      templateId: templateId || null,
    },
    req,
  });

  res.success({
    statusCode: 202,
    message: "Wizard article started",
    data: {
      articleId: article._id,
      wizardMode: true,
      stages: article.stages,
    },
  });
});

/* ──────────────────────────────────────────────────────────
 *  Precondition table — mirrors the design's API contract.
 * ────────────────────────────────────────────────────────── */
const PRIOR_STAGE = {
  research: null,
  outline: "research",
  draft: "outline",
  seo: "draft",
};

const assertCanRunStage = (article, stage) => {
  const target = getStageRecord(article, stage);
  if (!target) {
    throwError(`Stage '${stage}' missing on article`, 500);
  }
  if (target.status !== STAGE_STATUS.PENDING && target.status !== STAGE_STATUS.FAILED) {
    throwError(
      `Stage '${stage}' cannot run from current state '${target.status}'`,
      409,
      { code: FAILURE_REASONS.STAGE_TRANSITION_INVALID }
    );
  }
  const prior = PRIOR_STAGE[stage];
  if (prior) {
    const priorRecord = getStageRecord(article, prior);
    if (priorRecord?.status !== STAGE_STATUS.APPROVED) {
      throwError(
        `Stage '${prior}' must be approved before '${stage}' can run`,
        409,
        { code: FAILURE_REASONS.STAGE_TRANSITION_INVALID }
      );
    }
  }
};

/* ──────────────────────────────────────────────────────────
 *  POST /articles/:id/stages/:stage/run
 *  Transitions stage to RUNNING and enqueues a wizard-stage job.
 * ────────────────────────────────────────────────────────── */
export const runStage = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const { stage } = req.params;
  let article = await loadAuthorizedArticle({ req, mode: "write" });
  article = await ensureStagesArray(workspaceId, article);

  ensureQueueAvailable();
  assertCanRunStage(article, stage);

  // Atomic CAS pending|failed → running. Increment retryCount when
  // coming from failed (a re-run of a failed stage is a retry).
  const fromStatus = getStageRecord(article, stage).status;
  await transitionStage({
    workspaceId,
    articleId: article._id,
    stage,
    from: fromStatus,
    to: STAGE_STATUS.RUNNING,
    incrementRetry: fromStatus === STAGE_STATUS.FAILED,
  });

  let jobId = null;
  try {
    jobId = await enqueueStageJob({
      articleId: article._id,
      workspaceId,
      userId,
      stage,
    });
  } catch (err) {
    // Roll back to the previous status so the user can retry once Redis
    // recovers.
    await transitionStage({
      workspaceId,
      articleId: article._id,
      stage,
      from: STAGE_STATUS.RUNNING,
      to: fromStatus,
    }).catch(() => {});
    throw err;
  }

  res.success({
    statusCode: 202,
    message: `Stage '${stage}' started`,
    data: { articleId: article._id, stage, jobId },
  });
});

/* ──────────────────────────────────────────────────────────
 *  POST /articles/:id/stages/:stage/approve
 *  Idempotent transition awaiting_approval → approved.
 * ────────────────────────────────────────────────────────── */
export const approveStage = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const { stage } = req.params;
  let article = await loadAuthorizedArticle({ req, mode: "write" });
  article = await ensureStagesArray(workspaceId, article);

  const stageRecord = getStageRecord(article, stage);
  if (!stageRecord) throwError(`Stage '${stage}' missing`, 500);

  if (stageRecord.status === STAGE_STATUS.APPROVED) {
    return res.success({ message: "Stage already approved", data: { stage } });
  }
  if (stageRecord.status !== STAGE_STATUS.AWAITING_APPROVAL) {
    throwError(
      `Stage '${stage}' is not awaiting approval`,
      409,
      { code: FAILURE_REASONS.STAGE_NOT_AWAITING_APPROVAL }
    );
  }

  await transitionStage({
    workspaceId,
    articleId: article._id,
    stage,
    from: STAGE_STATUS.AWAITING_APPROVAL,
    to: STAGE_STATUS.APPROVED,
  });

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.stage.approved",
    entityType: "article",
    entityId: article._id,
    workspaceId,
    after: { stage },
    req,
  });

  res.success({ message: `Stage '${stage}' approved`, data: { stage } });
});

/* ──────────────────────────────────────────────────────────
 *  POST /articles/:id/stages/:stage/regenerate
 *  Re-runs an approved stage; cascades downstream clearing.
 *  Reserves an additional quota slot per Req 16.3.
 * ────────────────────────────────────────────────────────── */
export const regenerateStage = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const { stage } = req.params;
  let article = await loadAuthorizedArticle({ req, mode: "write" });
  article = await ensureStagesArray(workspaceId, article);

  const stageRecord = getStageRecord(article, stage);
  if (!stageRecord) throwError(`Stage '${stage}' missing`, 500);
  if (stageRecord.status !== STAGE_STATUS.APPROVED) {
    throwError(
      `Stage '${stage}' must be approved before regeneration`,
      409,
      { code: FAILURE_REASONS.STAGE_TRANSITION_INVALID }
    );
  }
  if (stage === "publish") {
    throwError("Publish stage cannot be regenerated", 400);
  }

  ensureQueueAvailable();
  await quotaService.checkAndReserve(workspaceId);

  // Cascade clear FIRST so the downstream stages reset to pending before
  // we flip the target stage back to running.
  await cascadeClearOnRegenerate({
    workspaceId,
    articleId: article._id,
    stage,
  });

  /* ──────────────────────────────────────────────────────
   *  Outline Enricher (Requirement 2)
   *
   *  Only runs when:
   *    - the regenerate target is the outline stage,
   *    - the HLP_OUTLINE_ENRICH_ENABLED flag is on,
   *    - and the article already has at least one prior approved
   *      outline (i.e., this is a "recharge" not a first-time run —
   *      Requirements 2.1, 2.2).
   *
   *  Failure isolation (Requirement 2.6): `prepareOutlineContext`
   *  never throws; it returns `null` on any failure. We log and
   *  fall through to the existing outline path.
   *
   *  Best-effort persistence (Requirement 2.7): a write failure on
   *  `Article.outlineContext` is logged but does not block the
   *  regenerate — we still pass the in-memory context to the worker.
   *
   *  Cascade behavior (Requirement 2.9) is preserved above.
   * ────────────────────────────────────────────────────── */
  let outlineContextForJob;
  if (
    stage === "outline" &&
    isFlagEnabled(HLP_OUTLINE_ENRICH_ENABLED) &&
    Array.isArray(article.outline) &&
    article.outline.length > 0
  ) {
    try {
      const brief = await findBriefByArticleId(workspaceId, article._id);
      if (brief) {
        const ctx = await prepareOutlineContext({ brief, article });
        if (ctx) {
          // Best-effort persistence — never block the regenerate on a
          // mongo write failure (Requirement 2.7).
          try {
            await updateArticleFields(workspaceId, article._id, {
              outlineContext: ctx,
            });
          } catch (persistErr) {
            logger.warn(
              "[wizardController] failed to persist outlineContext; proceeding with in-memory context",
              {
                articleId: String(article._id),
                message: persistErr?.message,
              }
            );
          }
          outlineContextForJob = ctx;
        }
      } else {
        logger.warn(
          "[wizardController] outline regenerate: brief missing, skipping enrichment",
          { articleId: String(article._id) }
        );
      }
    } catch (enrichErr) {
      // Defensive: prepareOutlineContext is documented as never-throw,
      // but if anything in the surrounding code (brief lookup, etc.)
      // throws, we still want the existing outline path to run.
      logger.warn(
        "[wizardController] outline enrichment threw; falling back to existing path",
        {
          articleId: String(article._id),
          message: enrichErr?.message,
        }
      );
    }
  }

  await transitionStage({
    workspaceId,
    articleId: article._id,
    stage,
    from: STAGE_STATUS.APPROVED,
    to: STAGE_STATUS.RUNNING,
  });

  let jobId = null;
  try {
    jobId = await enqueueStageJob({
      articleId: article._id,
      workspaceId,
      userId,
      stage,
      outlineContext: outlineContextForJob,
    });
  } catch (err) {
    await quotaService.refund(workspaceId).catch(() => {});
    throw err;
  }

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.stage.regenerated",
    entityType: "article",
    entityId: article._id,
    workspaceId,
    after: { stage, jobId },
    req,
  });

  res.success({
    statusCode: 202,
    message: `Stage '${stage}' regeneration started`,
    data: { articleId: article._id, stage, jobId },
  });
});

/* ──────────────────────────────────────────────────────────
 *  POST /articles/:id/stages/:stage/retry
 *  Retries a failed stage; increments retryCount; refuses
 *  past STAGE_RETRY_LIMIT.
 * ────────────────────────────────────────────────────────── */
export const retryStage = catchAsync(async (req, res) => {
  const { workspaceId, userId } = req.tenant;
  const { stage } = req.params;
  let article = await loadAuthorizedArticle({ req, mode: "write" });
  article = await ensureStagesArray(workspaceId, article);

  const stageRecord = getStageRecord(article, stage);
  if (!stageRecord) throwError(`Stage '${stage}' missing`, 500);
  if (stageRecord.status !== STAGE_STATUS.FAILED) {
    throwError(
      `Only failed stages can be retried`,
      409,
      { code: FAILURE_REASONS.STAGE_TRANSITION_INVALID }
    );
  }
  if ((stageRecord.retryCount || 0) >= STAGE_RETRY_LIMIT) {
    throwError(
      "Maximum retry count reached. Edit the previous stage or start over.",
      429,
      { code: FAILURE_REASONS.RETRY_LIMIT_EXCEEDED }
    );
  }

  ensureQueueAvailable();

  await transitionStage({
    workspaceId,
    articleId: article._id,
    stage,
    from: STAGE_STATUS.FAILED,
    to: STAGE_STATUS.RUNNING,
    incrementRetry: true,
  });

  let jobId = null;
  try {
    jobId = await enqueueStageJob({
      articleId: article._id,
      workspaceId,
      userId,
      stage,
    });
  } catch (err) {
    // Roll back retry increment + status.
    await transitionStage({
      workspaceId,
      articleId: article._id,
      stage,
      from: STAGE_STATUS.RUNNING,
      to: STAGE_STATUS.FAILED,
    }).catch(() => {});
    throw err;
  }

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.stage.retried",
    entityType: "article",
    entityId: article._id,
    workspaceId,
    after: { stage, retryCount: (stageRecord.retryCount || 0) + 1, jobId },
    req,
  });

  res.success({
    statusCode: 202,
    message: `Stage '${stage}' retry started`,
    data: { articleId: article._id, stage, jobId },
  });
});

/* ──────────────────────────────────────────────────────────
 *  PATCH /articles/:id/brief/source-selections
 *  Updates the brief's selected URL set and regenerates the
 *  bullet-summary over the selected subset.
 *
 *  Requirements 1.1, 1.2, 1.8, 1.10, 1.11, 1.12, 6.7:
 *    - Optional `enrichmentMode` request field accepts only "auto" or
 *      "skip"; any other value is rejected with HTTP 400 / code
 *      "INVALID_ENRICHMENT_MODE". Omitted is treated as "auto".
 *    - When the flag HLP_SOURCE_ENRICH_ENABLED is true and mode is
 *      "auto" (or omitted), the Source Enrichment Service is scheduled
 *      non-blocking via `Promise.resolve().then(...)` so the HTTP
 *      response returns within the same wall-clock budget as the
 *      pre-feature path (≤ 50 ms of added latency).
 *    - "skip" bypasses enrichment regardless of flag state.
 *    - Empty `selectedCanonicalUrls` array bypasses enrichment but
 *      persists the (empty) selection identically to pre-feature behavior.
 *    - Response body shape is exactly `{ selectedCanonicalUrls }` —
 *      identical to the pre-feature codebase (Property 1 / Req 1.2).
 * ────────────────────────────────────────────────────────── */
export const patchBriefSelections = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const { selectedCanonicalUrls, enrichmentMode } = req.body;

  // Requirement 1.11: validate optional enrichmentMode FIRST. Reject
  // any value other than "auto" or "skip" with the structured error
  // code so the client can branch on it.
  if (
    enrichmentMode !== undefined &&
    enrichmentMode !== "auto" &&
    enrichmentMode !== "skip"
  ) {
    throwError(
      "Invalid enrichmentMode; expected 'auto' or 'skip'",
      400,
      { code: "INVALID_ENRICHMENT_MODE" }
    );
  }

  let article = await loadAuthorizedArticle({ req, mode: "write" });
  article = await ensureStagesArray(workspaceId, article);

  const brief = await findBriefByArticleId(workspaceId, article._id);
  if (!brief) throwError("Research brief not found", 404);

  // Validate every URL exists in the brief's source set.
  const knownUrls = new Set((brief.sources || []).map((s) => s.url));
  const unknown = selectedCanonicalUrls.filter((u) => !knownUrls.has(u));
  if (unknown.length > 0) {
    throwError(
      `Source URL not in brief: ${unknown[0]}`,
      400,
      { code: FAILURE_REASONS.INVALID_SOURCE_URL }
    );
  }

  // Persist the selection.
  await updateArticleFields(workspaceId, article._id, {
    "briefSelections.selectedCanonicalUrls": selectedCanonicalUrls,
    "briefSelections.updatedAt": new Date(),
  });

  // Regenerate bullets over the selected sources only. Best-effort —
  // failure leaves prior bullets intact.
  try {
    const selectedSources = brief.sources.filter(
      (s) => !s.skipReason && knownUrls.has(s.url) && selectedCanonicalUrls.includes(s.url)
    );
    if (selectedSources.length >= 3) {
      const summary = await summarizeSourcesAsBrief({
        topic: brief.topic,
        targetKeyword: brief.targetKeyword,
        sources: selectedSources,
      });
      await upsertBriefForArticle(workspaceId, article._id, {
        topic: brief.topic,
        targetKeyword: brief.targetKeyword,
        sources: brief.sources,
        keptSourceCount: brief.keptSourceCount,
        skippedSourceCount: brief.skippedSourceCount,
        summaryBullets: summary.bullets,
        searchProvider: brief.searchProvider,
        searchDurationMs: brief.searchDurationMs,
        scrapeDurationMs: brief.scrapeDurationMs,
      });
    }
  } catch (err) {
    logger.warn("[wizard] brief re-summarization skipped", { message: err.message });
  }

  // Requirements 1.1, 1.8, 1.10, 1.12, 6.7: schedule Source Enrichment
  // Service non-blocking. The `Promise.resolve().then(...)` pattern
  // detaches the work from the request cycle so the HTTP response is
  // not extended by more than the cost of scheduling a microtask
  // (≪ 50 ms — Req 1.2). Failures inside the service are isolated and
  // logged by the service itself; we add a defensive .catch() here so
  // an unexpected synchronous throw cannot leak into an unhandled
  // rejection.
  const shouldEnrich =
    enrichmentMode !== "skip" &&                       // Req 1.10
    Array.isArray(selectedCanonicalUrls) &&
    selectedCanonicalUrls.length > 0 &&                // Req 1.12
    isFlagEnabled(HLP_SOURCE_ENRICH_ENABLED);          // Req 1.8 / 6.7

  if (shouldEnrich) {
    const articleId = article._id;

    // Requirement 1.9 / 6.8: emit one `source-enrichment` chunk per
    // source as enrichment completes. We use the existing wizard
    // stream channel under the `research` stage — the same channel
    // that already carries `source` and `summary_bullet` chunks for
    // this article. The new chunk type is added strictly as a NEW
    // value; no pre-existing chunk type's shape is altered.
    //
    // Publisher creation is a pure local-state setup (chunkIndex
    // counter + key-string) — no I/O, no allocation cost worth
    // measuring against the 50ms response-latency budget.
    const enrichmentPublisher = createStreamPublisher({
      articleId,
      stage: "research",
      workspaceId,
    });

    Promise.resolve()
      .then(() =>
        enrichSelectedSources({
          brief,
          selectedCanonicalUrls,
          articleId,
          // Per-source completion event. The publisher's `chunk` is
          // async (it pushes to Redis + emits over Socket.io); we
          // don't await here because the worker doesn't need the
          // emit to settle before moving to the next source — order
          // is preserved through the synchronous chunkIndex counter
          // that lives inside the publisher closure.
          onProgress: ({ url, status }) => {
            // Only "enriched" and "failed" reach this callback per
            // the service's documented contract (Req 1.9 scope).
            return enrichmentPublisher.chunk({
              chunkType: "source-enrichment",
              data: { sourceUrl: url, status },
            });
          },
        })
      )
      .catch((err) => {
        logger.warn("[wizard] source enrichment scheduling failed", {
          articleId: String(articleId),
          message: err?.message,
        });
      });
  }

  // Req 1.2 / Property 1: response body shape MUST be exactly
  // `{ selectedCanonicalUrls }` regardless of whether enrichment was
  // scheduled, skipped, or the flag is off.
  res.success({ message: "Source selections updated", data: { selectedCanonicalUrls } });
});

/* ──────────────────────────────────────────────────────────
 *  PATCH /articles/:id/outline
 *  POST   /articles/:id/outline/sections
 *  DELETE /articles/:id/outline/sections/:idx
 * ────────────────────────────────────────────────────────── */
export const patchOutline = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const { outline, tone, targetWordCount } = req.body;

  let article = await loadAuthorizedArticle({ req, mode: "write" });
  article = await ensureStagesArray(workspaceId, article);

  if (outline.length > 20) {
    throwError("Maximum 20 sections allowed", 400, {
      code: FAILURE_REASONS.MAX_SECTIONS_REACHED,
    });
  }

  const updates = { outline };
  if (tone) updates.tone = tone;
  if (targetWordCount) updates.targetWordCount = targetWordCount;

  const updated = await updateArticleFields(workspaceId, article._id, updates);
  res.success({ message: "Outline updated", data: { outline: updated.outline } });
});

export const appendOutlineSection = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  let article = await loadAuthorizedArticle({ req, mode: "write" });
  article = await ensureStagesArray(workspaceId, article);

  if ((article.outline || []).length >= 20) {
    throwError("Maximum 20 sections allowed", 400, {
      code: FAILURE_REASONS.MAX_SECTIONS_REACHED,
    });
  }

  const targetWordCount = article.targetWordCount || 1500;
  const defaultEstimate = Math.round(targetWordCount / 5 / 50) * 50 || 250;
  const newSection = {
    heading: req.body.heading || "Untitled section",
    subPoints: req.body.subPoints || [],
    estimatedWordCount: req.body.estimatedWordCount || defaultEstimate,
  };

  const updated = await updateArticleFields(workspaceId, article._id, {
    outline: [...(article.outline || []), newSection],
  });
  res.success({
    message: "Section added",
    data: { outline: updated.outline },
  });
});

export const removeOutlineSection = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const idx = parseInt(req.params.idx, 10);
  let article = await loadAuthorizedArticle({ req, mode: "write" });
  article = await ensureStagesArray(workspaceId, article);

  const current = article.outline || [];
  if (idx < 0 || idx >= current.length) {
    throwError("Section index out of range", 404);
  }

  const next = current.filter((_, i) => i !== idx);
  const updated = await updateArticleFields(workspaceId, article._id, {
    outline: next,
  });
  res.success({ message: "Section removed", data: { outline: updated.outline } });
});

/* ──────────────────────────────────────────────────────────
 *  GET /articles/:id/stages/:stage/chunks?since=<n>
 *  Replays Stream_Chunks from the Redis buffer.
 * ────────────────────────────────────────────────────────── */
export const getStageChunks = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  const { stage } = req.params;
  const since = parseInt(req.query?.since || "-1", 10);

  // Authorize via the same loader (allows viewer reads).
  const article = await loadAuthorizedArticle({ req, mode: "read" });

  const result = await readChunksSince(article._id.toString(), stage, since);

  res.success({
    message: "Chunks fetched",
    data: {
      articleId: article._id,
      stage,
      since,
      ...result,
    },
  });
});

/* ──────────────────────────────────────────────────────────
 *  Composite — cancel an in-progress wizard article. Soft-deletes
 *  it and refunds quota. Reuses existing article cancel flow but
 *  resets stages to skipped so the UI can render a clean state.
 * ────────────────────────────────────────────────────────── */
export const abandonWizard = catchAsync(async (req, res) => {
  const { workspaceId } = req.tenant;
  let article = await loadAuthorizedArticle({ req, mode: "write" });
  article = await ensureStagesArray(workspaceId, article);

  const anyApproved = (article.stages || []).some(
    (s) => s.status === STAGE_STATUS.APPROVED
  );

  await softDeleteArticle(workspaceId, article._id);
  if (!anyApproved && !article.quotaRefunded) {
    try {
      await quotaService.refund(workspaceId);
      await updateArticleFields(workspaceId, article._id, {
        quotaRefunded: true,
      });
    } catch (err) {
      logger.warn("[wizard] abandon refund failed", { message: err.message });
    }
  }

  await logAudit({
    actor: req.user,
    category: "content",
    action: "article.wizard_abandoned",
    entityType: "article",
    entityId: article._id,
    workspaceId,
    req,
  });

  res.success({ message: "Wizard abandoned", data: { articleId: article._id } });
});
