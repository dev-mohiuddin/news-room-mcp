import {
  findActiveArticleById,
  updateArticleFields,
  appendCostStage,
} from "#repositories/articleRepository.js";
import { findBriefByArticleId } from "#repositories/researchBriefRepository.js";
import {
  transitionStage,
  getStageRecord,
  ensureStagesArray,
} from "#repositories/wizardStageRepository.js";
import { runResearchStage } from "#services/article/researchService.js";
import { runOutlineStage } from "#services/article/outlineService.js";
import { runDraftStage } from "#services/article/draftService.js";
import { runTwoPassDraftStage } from "#services/article/twoPassDraftService.js";
import { runOriginalityStage } from "#services/article/originalityService.js";
import { runSeoStage } from "#services/article/seoService.js";
import { createStreamPublisher } from "#services/article/streamPublisher.js";
import { roundUsd } from "#constants/modelCosts.js";
import {
  STAGE_NAMES,
  STAGE_STATUS,
  STAGE_TIMEOUT_MS,
  FAILURE_REASONS,
} from "#constants/articleStatus.js";
import { isFlagEnabled, HLP_ORIGINALITY_GATE_ENABLED, HLP_TWO_PASS_DRAFTING_ENABLED } from "#utils/featureFlags.js";
import * as quotaService from "#services/billing/quotaService.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Wizard Orchestrator — Requirement 7, 8, 9, 12, 13, 16
 * ============================================================
 *
 *  Single entry point for the wizard-stage worker. Each invocation:
 *    1. Wraps the stage runner with a StreamPublisher (chunks emitted
 *       per-source, per-section, per-paragraph, per-SEO-field).
 *    2. Races the runner against the per-stage timeout budget.
 *    3. Persists the stage's output on the Article document.
 *    4. Transitions Stage_Status → `awaiting_approval` on success or
 *       → `failed` (with `recoverable` flag) on error.
 *    5. Refunds the article's quota slot when first-run + non-recoverable.
 *
 *  Approval / regenerate / retry flows live in the controller; this
 *  module is purely the executor invoked by BullMQ.
 */

/* ──────────────────────────────────────────────────────────
 *  Recoverable failure classification — Requirement 12.6/12.7
 * ────────────────────────────────────────────────────────── */

const RECOVERABLE_DRAFT_CODES = new Set([
  "UNRESOLVED_CITATION",
  "INSUFFICIENT_CITATION_DENSITY",
  "NO_CITATIONS",
  "DRAFT_WORD_COUNT_VIOLATION",
  "MISSING_CITATIONS",
  "VERBATIM_COPY_DETECTED",
  "ORIGINALITY_THRESHOLD_EXCEEDED",
]);

export const isRecoverableStageError = (stage, err) => {
  if (!err) return false;
  const code = err.code || "";

  if (code === FAILURE_REASONS.STAGE_TIMEOUT) return true;

  switch (stage) {
    case "research":
      // INSUFFICIENT_SOURCES is non-recoverable: another retry will hit
      // the same Brave/Exa results. The user must change the topic.
      return false;
    case "outline":
      return false;
    case "draft":
      return RECOVERABLE_DRAFT_CODES.has(code);
    case "seo":
      // SEO can be retried — it's stochastic LLM output.
      return code === "SEO_VALIDATION_FAILED";
    default:
      return false;
  }
};

/* ──────────────────────────────────────────────────────────
 *  Cost ledger helper
 * ────────────────────────────────────────────────────────── */

const pushCost = async ({ workspaceId, articleId, costEntry }) => {
  if (!costEntry) return;
  await appendCostStage(workspaceId, articleId, {
    ...costEntry,
    usdCost: roundUsd(costEntry.usdCost),
  });
};

/* ──────────────────────────────────────────────────────────
 *  Per-stage chunk fan-out
 *
 *  We emit chunks from the orchestrator AFTER the stage runner
 *  completes (per the design's "fallback recommended for first
 *  iteration"). This keeps the existing stage services unchanged
 *  but still hydrates the wizard UI piece-by-piece because each
 *  emit is a separate Socket.io message.
 * ────────────────────────────────────────────────────────── */

const fanOutResearch = async (publisher, output) => {
  const sources = output?.brief?.sources || output?.sourcesKept || [];
  for (const s of sources) {
    if (s.skipReason) continue;
    await publisher.chunk({
      chunkType: "source",
      data: {
        url: s.url,
        originalUrl: s.originalUrl || s.url,
        title: s.title || "",
        snippet: s.snippet || "",
        scraperProvider: s.scraperProvider || "",
        contentHash: s.contentHash || "",
        retrievedAt: s.retrievedAt || new Date().toISOString(),
        skipReason: s.skipReason || null,
      },
    });
  }
  for (const bullet of output?.brief?.summaryBullets || []) {
    await publisher.chunk({
      chunkType: "summary_bullet",
      data: {
        text: bullet.text,
        citationUrls: bullet.citationUrls || [],
      },
    });
  }
};

const fanOutOutline = async (publisher, output) => {
  for (const section of output?.outline || []) {
    await publisher.chunk({
      chunkType: "outline_section",
      data: {
        heading: section.heading,
        subPoints: section.subPoints || [],
        estimatedWordCount: section.estimatedWordCount,
      },
    });
  }
};

const fanOutDraft = async (publisher, output) => {
  for (const p of output?.paragraphs || []) {
    await publisher.chunk({
      chunkType: "paragraph",
      data: {
        id: p.id,
        html: p.html,
        markdown: p.markdown || "",
        tag: p.tag,
        citations: p.citations || [],
        wordCount: p.wordCount || 0,
      },
    });
  }
};

const fanOutSeo = async (publisher, output) => {
  const seo = output?.seo || {};
  if (Array.isArray(seo.metaTitleOptions) && seo.metaTitleOptions.length) {
    await publisher.chunk({
      chunkType: "meta_titles",
      data: { options: seo.metaTitleOptions },
    });
  }
  if (seo.metaDescription) {
    await publisher.chunk({
      chunkType: "meta_description",
      data: { value: seo.metaDescription },
    });
  }
  if (seo.slug) {
    await publisher.chunk({
      chunkType: "slug",
      data: { value: seo.slug },
    });
  }
  if (Array.isArray(seo.tags) && seo.tags.length) {
    await publisher.chunk({
      chunkType: "tags",
      data: { values: seo.tags },
    });
  }
  for (const f of seo.faq || []) {
    await publisher.chunk({
      chunkType: "faq",
      data: { entry: f },
    });
  }
};

/* ──────────────────────────────────────────────────────────
 *  Stage runners — wrap each existing stage service with
 *  timeout + persistence + chunk fan-out.
 * ────────────────────────────────────────────────────────── */

const withTimeout = (promise, timeoutMs, stage) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      const t = setTimeout(() => {
        const err = new Error(`Stage '${stage}' exceeded ${timeoutMs}ms budget`);
        err.code = FAILURE_REASONS.STAGE_TIMEOUT;
        reject(err);
      }, timeoutMs);
      // Unref so the timer doesn't keep the process alive after success.
      if (t.unref) t.unref();
    }),
  ]);

const inputsFromArticle = (article) => ({
  workspaceId: article.workspaceId,
  articleId: article._id,
  topic: article.topic,
  targetKeyword: article.targetKeyword,
  tone: article.tone || "Professional",
  targetWordCount: article.targetWordCount || 1500,
  additionalKeywords: article.additionalKeywords || [],
});

const persistResearchOutput = async ({ workspaceId, articleId, output }) => {
  await pushCost({
    workspaceId, articleId, costEntry: output.summaryCost,
  });
  await updateArticleFields(workspaceId, articleId, {
    researchBriefId: output.brief._id,
  });
};

const persistOutlineOutput = async ({ workspaceId, articleId, output }) => {
  await pushCost({ workspaceId, articleId, costEntry: output.cost });
  await updateArticleFields(workspaceId, articleId, {
    outline: output.outline,
    outlinePromptVersion: output.promptVersion,
  });
};

const persistDraftOutput = async ({ workspaceId, articleId, output }) => {
  await pushCost({ workspaceId, articleId, costEntry: output.cost });
  for (const entry of output.enrichmentCosts || []) {
    await pushCost({ workspaceId, articleId, costEntry: entry });
  }
  if (output.originalityCost) {
    await pushCost({ workspaceId, articleId, costEntry: output.originalityCost });
  }
  await updateArticleFields(workspaceId, articleId, {
    paragraphs: output.paragraphs,
    sourcesIndex: output.sourcesIndex,
    contentHtml: output.contentHtml,
    contentMarkdown: output.contentMarkdown,
    wordCount: output.wordCount,
    readingTimeMinutes: output.readingTimeMinutes,
    draftPromptVersion: output.promptVersion,
    ...(output.draftFormatting
      ? { draftFormatting: output.draftFormatting }
      : {}),
    ...(output.originalityRecord
      ? { originalityRecord: output.originalityRecord }
      : {}),
  });
};

const persistSeoOutput = async ({ workspaceId, articleId, output }) => {
  await pushCost({ workspaceId, articleId, costEntry: output.cost });
  await updateArticleFields(workspaceId, articleId, {
    seo: output.seo,
  });
};

const runStageInternal = async ({ stage, article, brief, outlineContext }) => {
  const inputs = inputsFromArticle(article);
  switch (stage) {
    case "research":
      return runResearchStage({
        workspaceId: inputs.workspaceId,
        articleId: inputs.articleId,
        topic: inputs.topic,
        targetKeyword: inputs.targetKeyword,
      });
    case "outline":
      return runOutlineStage({
        topic: inputs.topic,
        targetKeyword: inputs.targetKeyword,
        tone: inputs.tone,
        targetWordCount: inputs.targetWordCount,
        brief,
        outlineContext,
      });
    case "draft": {
      const draftOutput = isFlagEnabled(HLP_TWO_PASS_DRAFTING_ENABLED)
        ? await runTwoPassDraftStage({
            workspaceId: inputs.workspaceId,
            articleId: inputs.articleId,
            topic: inputs.topic,
            targetKeyword: inputs.targetKeyword,
            tone: inputs.tone,
            targetWordCount: inputs.targetWordCount,
            additionalKeywords: inputs.additionalKeywords,
            outline: article.outline,
            brief,
          })
        : await runDraftStage({
            workspaceId: inputs.workspaceId,
            articleId: inputs.articleId,
            topic: inputs.topic,
            targetKeyword: inputs.targetKeyword,
            tone: inputs.tone,
            targetWordCount: inputs.targetWordCount,
            additionalKeywords: inputs.additionalKeywords,
            outline: article.outline,
            brief,
          });

      /* ── Optional originality gate (Requirement 9) ──
       * Gated by HLP_ORIGINALITY_GATE_ENABLED. Runs after draft generation
       * but before persistence. Checks: (1) citation validator, (2) verbatim
       * span detector, (3) external provider score (Copyleaks/Originality.ai).
       * When the flag is OFF, this check is skipped entirely.
       */
      if (isFlagEnabled(HLP_ORIGINALITY_GATE_ENABLED)) {
        const originalityCheck = await runOriginalityStage({
          article: { paragraphs: draftOutput.paragraphs },
          brief,
        });
        if (!originalityCheck.ok) {
          const err = new Error(
            `Originality gate failed: ${originalityCheck.failureReason}`
          );
          err.code = originalityCheck.failureReason;
          err.details = originalityCheck.details;
          throw err;
        }
        // Persist originality record on the article document.
        if (originalityCheck.originalityRecord) {
          draftOutput.originalityRecord = originalityCheck.originalityRecord;
        }
        if (originalityCheck.cost) {
          draftOutput.originalityCost = originalityCheck.cost;
        }
      }

      return draftOutput;
    }
    case "seo":
      return runSeoStage({
        workspaceId: inputs.workspaceId,
        articleId: inputs.articleId,
        topic: inputs.topic,
        targetKeyword: inputs.targetKeyword,
        contentMarkdown: article.contentMarkdown,
        brief,
      });
    default:
      throw new Error(`Unknown stage '${stage}'`);
  }
};

const persistOutput = async ({ stage, workspaceId, articleId, output }) => {
  switch (stage) {
    case "research": return persistResearchOutput({ workspaceId, articleId, output });
    case "outline":  return persistOutlineOutput({ workspaceId, articleId, output });
    case "draft":    return persistDraftOutput({ workspaceId, articleId, output });
    case "seo":      return persistSeoOutput({ workspaceId, articleId, output });
    default: return null;
  }
};

const fanOut = async ({ stage, publisher, output }) => {
  switch (stage) {
    case "research": return fanOutResearch(publisher, output);
    case "outline":  return fanOutOutline(publisher, output);
    case "draft":    return fanOutDraft(publisher, output);
    case "seo":      return fanOutSeo(publisher, output);
    default: return null;
  }
};

/* ──────────────────────────────────────────────────────────
 *  Quota refund with bounded backoff — Requirement 16.5
 * ────────────────────────────────────────────────────────── */

const refundQuotaWithBackoff = async ({ workspaceId, articleId }) => {
  const article = await findActiveArticleById(workspaceId, articleId);
  if (!article || article.quotaRefunded || !article.quotaIncrementApplied) {
    return false;
  }
  let lastErr = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await quotaService.refund(workspaceId);
      await updateArticleFields(workspaceId, articleId, { quotaRefunded: true });
      return true;
    } catch (err) {
      lastErr = err;
      const delayMs = Math.min(2 ** attempt * 250, 8_000);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  logger.warn("[wizard-orchestrator] quota refund failed; reconciliation will retry", {
    workspaceId: String(workspaceId),
    articleId: String(articleId),
    message: lastErr?.message,
  });
  return false;
};

/* ──────────────────────────────────────────────────────────
 *  Public — Worker entry point
 * ────────────────────────────────────────────────────────── */

export const runStageJob = async ({
  articleId, workspaceId, userId, stage, outlineContext,
}) => {
  if (!STAGE_NAMES.includes(stage)) {
    throw new Error(`Unknown stage '${stage}'`);
  }

  let article = await findActiveArticleById(workspaceId, articleId);
  if (!article) {
    const err = new Error(`Article ${articleId} not found in workspace ${workspaceId}`);
    err.code = "ARTICLE_NOT_FOUND";
    throw err;
  }
  article = await ensureStagesArray(workspaceId, article);

  const stageRecord = getStageRecord(article, stage);
  // The controller is responsible for transitioning into RUNNING before
  // enqueueing. If that hasn't happened, refuse the job — it indicates
  // a missing CAS check upstream.
  if (!stageRecord || stageRecord.status !== STAGE_STATUS.RUNNING) {
    const err = new Error(
      `Stage '${stage}' is not in RUNNING state; refusing to execute`
    );
    err.code = FAILURE_REASONS.STAGE_TRANSITION_INVALID;
    throw err;
  }

  const publisher = createStreamPublisher({ articleId, stage, workspaceId });
  const retryCount = stageRecord.retryCount || 0;
  await publisher.started({ retryCount });

  const timeoutMs = STAGE_TIMEOUT_MS[stage] || 300_000;

  try {
    let brief = null;
    if (stage !== "research") {
      brief = await findBriefByArticleId(workspaceId, articleId);
    }

    const output = await withTimeout(
      runStageInternal({ stage, article, brief, outlineContext }),
      timeoutMs,
      stage
    );

    await persistOutput({ stage, workspaceId, articleId, output });
    await fanOut({ stage, publisher, output });

    await transitionStage({
      workspaceId,
      articleId,
      stage,
      from: STAGE_STATUS.RUNNING,
      to: STAGE_STATUS.AWAITING_APPROVAL,
      set: { chunkCount: publisher.getChunkCount() },
    });

    await publisher.completed({
      output: serializeOutputForClient(stage, output),
    });

    return { ok: true, stage, chunks: publisher.getChunkCount() };
  } catch (err) {
    const recoverable = isRecoverableStageError(stage, err);
    const reason =
      err.code ||
      (stage === "research" ? FAILURE_REASONS.RESEARCH_STAGE_ERROR :
       stage === "outline"  ? FAILURE_REASONS.OUTLINE_PARSE_FAILED :
       stage === "draft"    ? FAILURE_REASONS.DRAFT_STAGE_ERROR :
       stage === "seo"      ? FAILURE_REASONS.SEO_STAGE_ERROR :
       "STAGE_ERROR");

    try {
      await transitionStage({
        workspaceId,
        articleId,
        stage,
        from: STAGE_STATUS.RUNNING,
        to: STAGE_STATUS.FAILED,
        set: { failureReason: reason, recoverable },
      });
    } catch (txErr) {
      logger.error("[wizard-orchestrator] failure transition lost CAS", {
        articleId: String(articleId), stage, message: txErr.message,
      });
    }

    await publisher.failed({
      failureReason: reason,
      recoverable,
      retryCount,
    });

    // Non-recoverable on first run → refund quota slot.
    if (!recoverable && retryCount === 0) {
      await refundQuotaWithBackoff({ workspaceId, articleId });
    }

    // Re-throw so BullMQ marks the job as failed in its dashboard.
    throw err;
  }
};

/**
 * Returns a cleaned, non-mongoose snapshot of the stage output for the
 * `article:stage_completed` payload. Strips internal fields (cleanedMarkdown,
 * contentHash, etc.) that the wizard doesn't render.
 */
const serializeOutputForClient = (stage, output) => {
  if (!output) return null;
  switch (stage) {
    case "research":
      return {
        sources: (output.sourcesKept || []).map((s) => ({
          url: s.url, title: s.title, snippet: s.snippet,
          scraperProvider: s.scraperProvider,
        })),
        summaryBullets: output.brief?.summaryBullets || [],
      };
    case "outline":
      return { outline: output.outline };
    case "draft":
      return {
        paragraphs: output.paragraphs,
        sourcesIndex: output.sourcesIndex,
        wordCount: output.wordCount,
        readingTimeMinutes: output.readingTimeMinutes,
        originalityRecord: output.originalityRecord || null,
      };
    case "seo":
      return { seo: output.seo };
    default:
      return null;
  }
};
