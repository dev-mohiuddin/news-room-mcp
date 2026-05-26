import { logger } from "#utils/logger.js";
import {
  ARTICLE_STATUS,
  FAILURE_REASONS,
  STAGE_PROGRESS,
} from "#constants/articleStatus.js";
import {
  findActiveArticleById,
  transitionStatus,
  markFailed,
  updateArticleFields,
  appendCostStage,
  setCostsTotal,
} from "#repositories/articleRepository.js";
import { findBriefByArticleId } from "#repositories/researchBriefRepository.js";
import { runResearchStage } from "#services/article/researchService.js";
import { runOutlineStage } from "#services/article/outlineService.js";
import { runDraftStage } from "#services/article/draftService.js";
import { runSeoStage } from "#services/article/seoService.js";
import { runOriginalityStage } from "#services/article/originalityService.js";
import { runFactCheck } from "#services/article/factCheckService.js";
import { generateAiCitationAssets } from "#services/article/aiCitationService.js";
import { roundUsd } from "#constants/modelCosts.js";
import * as quotaService from "#services/billing/quotaService.js";
import { logAudit } from "#utils/auditLogger.js";
import { emitProgress, emitDone, emitFailed } from "#socket/articleEvents.js";

/**
 * ============================================================
 *  Article Pipeline Orchestrator — Requirement 13
 * ============================================================
 *
 *  Runs ONE article through the full chain. Each stage:
 *    1. CAS-transitions the article into the stage's status
 *    2. Runs the stage logic
 *    3. Persists the stage's output + cost entry
 *    4. Emits an `article:progress` socket event
 *
 *  On any stage error:
 *    - Maps to a failure reason from FAILURE_REASONS
 *    - Transitions article → failed (terminal) or → needs_revision (recoverable)
 *    - Refunds quota when the terminal state is `failed` (Req 11.4)
 *    - Emits `article:failed` socket event
 *
 *  This module is called by the BullMQ worker. The API route only enqueues.
 */

const pushCost = async ({ workspaceId, articleId, costEntry }) => {
  if (!costEntry) return;
  await appendCostStage(workspaceId, articleId, {
    ...costEntry,
    usdCost: roundUsd(costEntry.usdCost),
  });
};

const finalizeCostsTotal = async ({ workspaceId, article }) => {
  const total = (article.costs?.stages || []).reduce(
    (acc, s) => acc + (Number(s.usdCost) || 0),
    0
  );
  await setCostsTotal(workspaceId, article._id, roundUsd(total));
};

const handleStageFailure = async ({
  workspaceId,
  articleId,
  fromStatus,
  errorCode,
  recoverable,
}) => {
  const targetStatus = recoverable
    ? ARTICLE_STATUS.NEEDS_REVISION
    : ARTICLE_STATUS.FAILED;

  await transitionStatus({
    workspaceId,
    articleId,
    from: fromStatus,
    to: targetStatus,
    reason: errorCode,
    set: { failureReason: errorCode },
  });

  // Refund quota only on terminal `failed`. Per spec, `needs_revision`
  // keeps the slot consumed so the user can retry without a refund-loop.
  if (targetStatus === ARTICLE_STATUS.FAILED) {
    try {
      await quotaService.refund(workspaceId);
      await updateArticleFields(workspaceId, articleId, {
        quotaRefunded: true,
      });
    } catch (err) {
      logger.warn("[pipeline] quota refund failed", {
        articleId: String(articleId),
        message: err.message,
      });
    }
  }

  emitFailed({
    workspaceId,
    articleId,
    status: targetStatus,
    failureReason: errorCode,
  });
};

/**
 * Runs the full pipeline for one article job.
 *
 * @param {Object} args
 * @param {String} args.articleId
 * @param {String} args.workspaceId
 * @param {String} args.userId
 */
export const runArticlePipeline = async ({ articleId, workspaceId, userId }) => {
  const article = await findActiveArticleById(workspaceId, articleId);
  if (!article) throw new Error(`Article ${articleId} not found in workspace ${workspaceId}`);

  // If already terminal or beyond stage, do nothing (idempotent recovery).
  if ([ARTICLE_STATUS.PUBLISHED, ARTICLE_STATUS.FAILED, ARTICLE_STATUS.DRAFT_READY].includes(article.status)) {
    logger.info("[pipeline] skipping — article already settled", {
      articleId: String(articleId),
      status: article.status,
    });
    return { skipped: true, status: article.status };
  }

  /* ── Stage 1: research ───────────────────────────────────── */
  let current = article;
  try {
    current = await transitionStatus({
      workspaceId,
      articleId,
      from: ARTICLE_STATUS.DRAFT,
      to: ARTICLE_STATUS.RESEARCHING,
    });
    emitProgress({
      workspaceId,
      articleId,
      status: ARTICLE_STATUS.RESEARCHING,
      stage: "research",
      percent: STAGE_PROGRESS.research,
    });

    const research = await runResearchStage({
      workspaceId,
      articleId,
      topic: article.topic,
      targetKeyword: article.targetKeyword,
    });

    await pushCost({ workspaceId, articleId, costEntry: research.summaryCost });
    await updateArticleFields(workspaceId, articleId, {
      researchBriefId: research.brief._id,
    });
  } catch (err) {
    const code = err.code === "INSUFFICIENT_SOURCES"
      ? FAILURE_REASONS.INSUFFICIENT_SOURCES
      : "RESEARCH_STAGE_ERROR";
    await handleStageFailure({
      workspaceId,
      articleId,
      fromStatus: ARTICLE_STATUS.RESEARCHING,
      errorCode: code,
      recoverable: false,
    });
    throw err;
  }

  /* ── Stage 2: outline ────────────────────────────────────── */
  let outlineRes;
  try {
    await transitionStatus({
      workspaceId,
      articleId,
      from: ARTICLE_STATUS.RESEARCHING,
      to: ARTICLE_STATUS.OUTLINING,
    });
    emitProgress({
      workspaceId,
      articleId,
      status: ARTICLE_STATUS.OUTLINING,
      stage: "outline",
      percent: STAGE_PROGRESS.outline,
    });

    const brief = await findBriefByArticleId(workspaceId, articleId);
    outlineRes = await runOutlineStage({
      topic: article.topic,
      targetKeyword: article.targetKeyword,
      tone: article.tone,
      targetWordCount: article.targetWordCount || 1500,
      brief,
    });

    await updateArticleFields(workspaceId, articleId, {
      outline: outlineRes.outline,
      outlinePromptVersion: outlineRes.promptVersion,
    });
    await pushCost({ workspaceId, articleId, costEntry: outlineRes.cost });
  } catch (err) {
    await handleStageFailure({
      workspaceId,
      articleId,
      fromStatus: ARTICLE_STATUS.OUTLINING,
      errorCode: err.code || FAILURE_REASONS.OUTLINE_PARSE_FAILED,
      recoverable: false,
    });
    throw err;
  }

  /* ── Stage 3: draft ─────────────────────────────────────── */
  let draftRes;
  try {
    await transitionStatus({
      workspaceId,
      articleId,
      from: ARTICLE_STATUS.OUTLINING,
      to: ARTICLE_STATUS.DRAFTING,
    });
    emitProgress({
      workspaceId,
      articleId,
      status: ARTICLE_STATUS.DRAFTING,
      stage: "draft",
      percent: STAGE_PROGRESS.draft,
    });

    const brief = await findBriefByArticleId(workspaceId, articleId);
    draftRes = await runDraftStage({
      workspaceId,
      articleId,
      topic: article.topic,
      targetKeyword: article.targetKeyword,
      tone: article.tone,
      targetWordCount: article.targetWordCount || 1500,
      additionalKeywords: article.additionalKeywords || [],
      outline: outlineRes.outline,
      brief,
    });

    await updateArticleFields(workspaceId, articleId, {
      paragraphs: draftRes.paragraphs,
      sourcesIndex: draftRes.sourcesIndex,
      contentHtml: draftRes.contentHtml,
      contentMarkdown: draftRes.contentMarkdown,
      wordCount: draftRes.wordCount,
      readingTimeMinutes: draftRes.readingTimeMinutes,
      draftPromptVersion: draftRes.promptVersion,
    });
    // Persist the main draft cost AND any enrichment costs (audience etc.)
    await pushCost({ workspaceId, articleId, costEntry: draftRes.cost });
    for (const entry of draftRes.enrichmentCosts || []) {
      await pushCost({ workspaceId, articleId, costEntry: entry });
    }
  } catch (err) {
    const recoverable = ["UNRESOLVED_CITATION", "INSUFFICIENT_CITATION_DENSITY", "NO_CITATIONS"].includes(err.code);
    await handleStageFailure({
      workspaceId,
      articleId,
      fromStatus: ARTICLE_STATUS.DRAFTING,
      errorCode: err.code || FAILURE_REASONS.DRAFT_WORD_COUNT_VIOLATION,
      recoverable,
    });
    throw err;
  }

  /* ── Stage 3.5 (Phase B): Fact-check the draft ─────────── */
  try {
    const brief = await findBriefByArticleId(workspaceId, articleId);
    const factCheck = await runFactCheck({
      paragraphs: draftRes.paragraphs,
      brief,
    });
    await updateArticleFields(workspaceId, articleId, {
      factCheck: { ...factCheck.report, checkedAt: new Date() },
    });
    if (factCheck.cost) {
      await pushCost({ workspaceId, articleId, costEntry: factCheck.cost });
    }
    const blockers = (factCheck.report.flags || []).filter(
      (f) => f.severity === "blocker"
    );
    if (factCheck.report.verdict === "revise" && blockers.length > 0) {
      logger.warn("[fact-check] blockers detected", {
        articleId: String(articleId),
        blockers: blockers.length,
      });
      await handleStageFailure({
        workspaceId,
        articleId,
        fromStatus: ARTICLE_STATUS.DRAFTING,
        errorCode: FAILURE_REASONS.FACT_CHECK_BLOCKED,
        recoverable: true,
      });
      return { ok: false, failureReason: FAILURE_REASONS.FACT_CHECK_BLOCKED };
    }
  } catch (err) {
    logger.warn("[fact-check] stage swallowed (advisory only)", {
      message: err.message,
    });
  }

  /* ── Stage 4: SEO ───────────────────────────────────────── */
  let seoRes;
  try {
    await transitionStatus({
      workspaceId,
      articleId,
      from: ARTICLE_STATUS.DRAFTING,
      to: ARTICLE_STATUS.SEO_OPTIMIZING,
    });
    emitProgress({
      workspaceId,
      articleId,
      status: ARTICLE_STATUS.SEO_OPTIMIZING,
      stage: "seo",
      percent: STAGE_PROGRESS.seo,
    });

    const brief = await findBriefByArticleId(workspaceId, articleId);
    seoRes = await runSeoStage({
      workspaceId,
      topic: article.topic,
      targetKeyword: article.targetKeyword,
      contentMarkdown: draftRes.contentMarkdown,
      brief,
    });

    await updateArticleFields(workspaceId, articleId, {
      seo: seoRes.seo,
    });
    await pushCost({ workspaceId, articleId, costEntry: seoRes.cost });
  } catch (err) {
    await handleStageFailure({
      workspaceId,
      articleId,
      fromStatus: ARTICLE_STATUS.SEO_OPTIMIZING,
      errorCode: err.code || FAILURE_REASONS.SEO_VALIDATION_FAILED,
      recoverable: false,
    });
    throw err;
  }

  /* ── Stage 4.5 (Phase B): AI Citation assets (advisory) ── */
  try {
    const refreshed = await findActiveArticleById(workspaceId, articleId);
    const aiCitation = await generateAiCitationAssets({
      article: refreshed,
    });
    if (aiCitation.assets) {
      await updateArticleFields(workspaceId, articleId, {
        aiCitation: { ...aiCitation.assets, generatedAt: new Date() },
      });
    }
    if (aiCitation.cost) {
      await pushCost({ workspaceId, articleId, costEntry: aiCitation.cost });
    }
  } catch (err) {
    logger.warn("[ai-citation] stage swallowed (advisory only)", {
      message: err.message,
    });
  }

  /* ── Stage 5: originality ───────────────────────────────── */
  try {
    await transitionStatus({
      workspaceId,
      articleId,
      from: ARTICLE_STATUS.SEO_OPTIMIZING,
      to: ARTICLE_STATUS.ORIGINALITY_CHECKING,
    });
    emitProgress({
      workspaceId,
      articleId,
      status: ARTICLE_STATUS.ORIGINALITY_CHECKING,
      stage: "originality",
      percent: STAGE_PROGRESS.originality,
    });

    const fresh = await findActiveArticleById(workspaceId, articleId);
    const brief = await findBriefByArticleId(workspaceId, articleId);
    const orig = await runOriginalityStage({ article: fresh, brief });

    if (orig.cost) await pushCost({ workspaceId, articleId, costEntry: orig.cost });

    if (!orig.ok) {
      // Persist the originality record (score + flagged spans for UI)
      if (orig.originalityRecord) {
        await updateArticleFields(workspaceId, articleId, {
          originality: {
            ...orig.originalityRecord,
            revisionAttempt: (fresh.originality?.revisionAttempt || 0) + 1,
          },
        });
      }
      const recoverable = orig.failureReason !== "ORIGINALITY_PROVIDER_ERROR";

      // 3-strike rule (Req 6.12)
      const attempt = (fresh.originality?.revisionAttempt || 0) + 1;
      const finalCode =
        recoverable && attempt >= 3
          ? FAILURE_REASONS.ORIGINALITY_RETRIES_EXHAUSTED
          : orig.failureReason;
      const finalRecoverable = recoverable && attempt < 3;

      await handleStageFailure({
        workspaceId,
        articleId,
        fromStatus: ARTICLE_STATUS.ORIGINALITY_CHECKING,
        errorCode: finalCode,
        recoverable: finalRecoverable,
      });
      const updatedAfter = await findActiveArticleById(workspaceId, articleId);
      await finalizeCostsTotal({ workspaceId, article: updatedAfter });
      return { ok: false, failureReason: finalCode };
    }

    // Success: persist record + transition → draft_ready
    await updateArticleFields(workspaceId, articleId, {
      originality: {
        ...orig.originalityRecord,
        revisionAttempt: (fresh.originality?.revisionAttempt || 0) + 1,
      },
    });
    await transitionStatus({
      workspaceId,
      articleId,
      from: ARTICLE_STATUS.ORIGINALITY_CHECKING,
      to: ARTICLE_STATUS.DRAFT_READY,
    });
  } catch (err) {
    await handleStageFailure({
      workspaceId,
      articleId,
      fromStatus: ARTICLE_STATUS.ORIGINALITY_CHECKING,
      errorCode: err.code || FAILURE_REASONS.ORIGINALITY_PROVIDER_ERROR,
      recoverable: false,
    });
    throw err;
  }

  /* ── Done ───────────────────────────────────────────────── */
  const settled = await findActiveArticleById(workspaceId, articleId);
  await finalizeCostsTotal({ workspaceId, article: settled });

  emitDone({
    workspaceId,
    articleId,
    status: ARTICLE_STATUS.DRAFT_READY,
  });

  await logAudit({
    actor: { id: userId, role: "writer" },
    category: "content",
    action: "article.draft_ready",
    entityType: "article",
    entityId: articleId,
    workspaceId,
  });

  return { ok: true, status: ARTICLE_STATUS.DRAFT_READY };
};
