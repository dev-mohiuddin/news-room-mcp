import { Article } from "#models/articleModel.js";
import {
  ARTICLE_STATUS,
  STAGE_NAMES,
  STAGE_STATUS,
  isValidStageTransition,
  STAGE_RETRY_LIMIT,
  FAILURE_REASONS,
} from "#constants/articleStatus.js";
import { MissingTenantScopeError } from "#utils/pipelineErrors.js";

/**
 * ============================================================
 *  Wizard Stage Repository — Requirement 7 (Stage_Status persistence
 *  + Approval_Gates) and Requirement 8 (cascade clearing).
 * ============================================================
 *
 *  All wizard endpoints transition stages exclusively through
 *  `transitionStage()` so the state machine is enforced atomically
 *  via a Mongo CAS update. Bypassing this helper is a bug.
 *
 *  Legacy articles created before the wizard feature have no
 *  `stages[]` field. `ensureStagesArray()` lazily backfills them
 *  the first time a wizard endpoint touches the article so the
 *  rest of the wizard code never has to special-case them.
 */

const requireScope = (workspaceId, method) => {
  if (!workspaceId) throw new MissingTenantScopeError(method);
};

/* ──────────────────────────────────────────────────────────
 *  Lazy migration — Requirement 1.4, design "Lazy migration
 *  for legacy articles"
 * ────────────────────────────────────────────────────────── */

/**
 * Map a legacy `Article.status` value onto the corresponding wizard
 * stage statuses. Returns `[research, outline, draft, seo, publish]`
 * matched to STAGE_NAMES order.
 *
 * Inferences are conservative — when in doubt we mark the latest
 * touched stage `approved` and the next as `pending` so the wizard
 * UI lets the user re-run from there without losing data.
 */
const inferStageStatuses = (article) => {
  const has = (field) =>
    article[field] != null &&
    (Array.isArray(article[field])
      ? article[field].length > 0
      : Object.keys(article[field] || {}).length > 0);

  const out = STAGE_NAMES.map((name) => ({
    name,
    status: STAGE_STATUS.PENDING,
  }));

  const approve = (idx) => {
    out[idx].status = STAGE_STATUS.APPROVED;
    out[idx].approvedAt = new Date();
    out[idx].completedAt = new Date();
  };
  const fail = (idx, reason) => {
    out[idx].status = STAGE_STATUS.FAILED;
    out[idx].failureReason = reason || null;
    out[idx].completedAt = new Date();
  };
  const run = (idx) => {
    out[idx].status = STAGE_STATUS.RUNNING;
    out[idx].startedAt = new Date();
  };

  switch (article.status) {
    case ARTICLE_STATUS.DRAFT:
      // Brand new article — every stage pending.
      break;
    case ARTICLE_STATUS.RESEARCHING:
      run(0);
      break;
    case ARTICLE_STATUS.OUTLINING:
      approve(0);
      run(1);
      break;
    case ARTICLE_STATUS.DRAFTING:
      approve(0);
      approve(1);
      run(2);
      break;
    case ARTICLE_STATUS.SEO_OPTIMIZING:
      approve(0);
      approve(1);
      approve(2);
      run(3);
      break;
    case ARTICLE_STATUS.ORIGINALITY_CHECKING:
    case ARTICLE_STATUS.DRAFT_READY:
    case ARTICLE_STATUS.SCHEDULED:
    case ARTICLE_STATUS.PUBLISHING:
    case ARTICLE_STATUS.PUBLISHED:
      approve(0);
      approve(1);
      approve(2);
      approve(3);
      out[4].status =
        article.status === ARTICLE_STATUS.PUBLISHED
          ? STAGE_STATUS.APPROVED
          : STAGE_STATUS.PENDING;
      if (article.status === ARTICLE_STATUS.PUBLISHED) {
        out[4].completedAt = article.publishedAt || new Date();
        out[4].approvedAt = article.publishedAt || new Date();
      }
      break;
    case ARTICLE_STATUS.NEEDS_REVISION:
    case ARTICLE_STATUS.FAILED: {
      // Approve every stage whose output is on the document; mark the
      // first one without output as failed.
      const reason = article.failureReason || null;
      if (has("paragraphs")) approve(2);
      else if (has("outline")) approve(1);
      else if (has("researchBriefId")) approve(0);

      const firstUnapproved = out.findIndex(
        (s) => s.status !== STAGE_STATUS.APPROVED
      );
      if (firstUnapproved !== -1) fail(firstUnapproved, reason);
      break;
    }
    default:
      // Unknown status — leave everything pending.
      break;
  }

  return out;
};

/**
 * Idempotent: ensures the article carries a 5-element `stages[]`. Returns
 * the article (possibly mutated). The caller persists when needed.
 */
export const ensureStagesArray = async (workspaceId, article) => {
  requireScope(workspaceId, "ensureStagesArray");
  if (!article) return article;
  if (Array.isArray(article.stages) && article.stages.length === STAGE_NAMES.length) {
    return article;
  }

  const stages = inferStageStatuses(article);

  await Article.updateOne(
    { _id: article._id, workspaceId },
    { $set: { stages } }
  ).exec();
  article.stages = stages;
  return article;
};

/* ──────────────────────────────────────────────────────────
 *  Stage state-machine transitions — Requirement 7
 * ────────────────────────────────────────────────────────── */

const stageError = (code, message, details) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = code === FAILURE_REASONS.STAGE_NOT_AWAITING_APPROVAL ? 409 : 400;
  if (details) err.details = details;
  return err;
};

/**
 * Read a stage record from a hydrated article object.
 */
export const getStageRecord = (article, stageName) => {
  if (!article?.stages) return null;
  return article.stages.find((s) => s.name === stageName) || null;
};

/**
 * Atomic CAS transition on a single stage entry. Uses the positional
 * `$` operator after a filter on `stages.name` + `stages.status` so two
 * concurrent calls cannot both succeed.
 *
 * @param {Object} args
 * @param {String} args.workspaceId
 * @param {String} args.articleId
 * @param {String} args.stage           one of STAGE_NAMES
 * @param {String} args.from            expected current status
 * @param {String} args.to              target status
 * @param {Object} [args.set]           additional patch fields scoped to the
 *                                      stage record (e.g. failureReason)
 * @param {Boolean} [args.incrementRetry] when true, $inc stages.$.retryCount
 *
 * @returns updated article
 */
export const transitionStage = async ({
  workspaceId,
  articleId,
  stage,
  from,
  to,
  set = {},
  incrementRetry = false,
}) => {
  requireScope(workspaceId, "transitionStage");
  if (!STAGE_NAMES.includes(stage)) {
    throw stageError(
      FAILURE_REASONS.STAGE_TRANSITION_INVALID,
      `Unknown stage '${stage}'`
    );
  }
  if (!isValidStageTransition(from, to)) {
    throw stageError(
      from === STAGE_STATUS.RUNNING && to === STAGE_STATUS.APPROVED
        ? FAILURE_REASONS.STAGE_NOT_AWAITING_APPROVAL
        : FAILURE_REASONS.STAGE_TRANSITION_INVALID,
      `Cannot transition stage '${stage}' from '${from}' to '${to}'`,
      { stage, from, to }
    );
  }

  // Build the patch: prefix every key with `stages.$.` so it lands on the
  // matched array element only.
  const patch = {};
  for (const [k, v] of Object.entries(set)) {
    patch[`stages.$.${k}`] = v;
  }
  patch["stages.$.status"] = to;

  // Stamp standard timestamps when not explicitly overridden.
  const now = new Date();
  if (to === STAGE_STATUS.RUNNING && set.startedAt === undefined) {
    patch["stages.$.startedAt"] = now;
    patch["stages.$.failureReason"] = null;
    patch["stages.$.recoverable"] = false;
  }
  if (to === STAGE_STATUS.AWAITING_APPROVAL && set.completedAt === undefined) {
    patch["stages.$.completedAt"] = now;
  }
  if (to === STAGE_STATUS.APPROVED && set.approvedAt === undefined) {
    patch["stages.$.approvedAt"] = now;
  }
  if (to === STAGE_STATUS.FAILED && set.completedAt === undefined) {
    patch["stages.$.completedAt"] = now;
  }

  const update = { $set: patch };
  if (incrementRetry) {
    update.$inc = { "stages.$.retryCount": 1 };
  }

  const updated = await Article.findOneAndUpdate(
    {
      _id: articleId,
      workspaceId,
      deletedAt: null,
      stages: { $elemMatch: { name: stage, status: from } },
    },
    update,
    { new: true }
  ).exec();

  if (!updated) {
    throw stageError(
      FAILURE_REASONS.STAGE_TRANSITION_INVALID,
      `Stage '${stage}' is not currently '${from}' (CAS lost)`,
      { stage, from, to }
    );
  }

  // Defensive retry-limit enforcement — Requirement 12.4.
  const stageRecord = getStageRecord(updated, stage);
  if (
    stageRecord &&
    incrementRetry &&
    stageRecord.retryCount > STAGE_RETRY_LIMIT
  ) {
    // Roll back the over-limit increment and reject.
    await Article.updateOne(
      {
        _id: articleId,
        workspaceId,
        "stages.name": stage,
      },
      { $inc: { "stages.$.retryCount": -1 } }
    ).exec();
    throw stageError(
      FAILURE_REASONS.RETRY_LIMIT_EXCEEDED,
      `Stage '${stage}' has exceeded the retry limit`,
      { stage, retryLimit: STAGE_RETRY_LIMIT }
    );
  }

  return updated;
};

/* ──────────────────────────────────────────────────────────
 *  Cascade clearing on regenerate — Requirement 8.4–8.7
 *
 *  Re-running an upstream stage invalidates every downstream stage's
 *  output. We reset their state to `pending` and wipe their persisted
 *  output fields in the same Mongo update for atomicity.
 * ────────────────────────────────────────────────────────── */

const STAGE_DOWNSTREAM = Object.freeze({
  research: ["outline", "draft", "seo", "publish"],
  outline: ["draft", "seo", "publish"],
  draft: ["seo", "publish"],
  seo: ["publish"],
  publish: [],
});

const STAGE_OUTPUT_RESET = Object.freeze({
  research: {
    researchBriefId: null,
    "briefSelections.selectedCanonicalUrls": [],
    "briefSelections.updatedAt": null,
  },
  outline: {
    outline: [],
    outlinePromptVersion: null,
  },
  draft: {
    paragraphs: [],
    sourcesIndex: [],
    contentHtml: "",
    contentMarkdown: "",
    wordCount: 0,
    readingTimeMinutes: 0,
    draftPromptVersion: null,
  },
  seo: {
    seo: { metaTitleOptions: [], metaTitle: null, metaDescription: null, slug: null, faq: [], tags: [], ogTitle: null, ogDescription: null, ogImage: null },
  },
  publish: {
    publishConfig: {
      mode: "draft",
      scheduledAt: null,
      cmsConnectionId: null,
      featuredImage: null,
      checklistOverride: false,
      checklistOverrideReason: "",
    },
  },
});

/**
 * Clear every downstream stage's persisted output and reset its
 * Stage_Status to `pending`. Used by both `regenerate` and `retry`-of-
 * upstream-stage actions.
 */
export const cascadeClearOnRegenerate = async ({
  workspaceId,
  articleId,
  stage,
}) => {
  requireScope(workspaceId, "cascadeClearOnRegenerate");
  if (!STAGE_NAMES.includes(stage)) {
    throw stageError(
      FAILURE_REASONS.STAGE_TRANSITION_INVALID,
      `Unknown stage '${stage}'`
    );
  }
  const downstream = STAGE_DOWNSTREAM[stage] || [];
  if (downstream.length === 0) return null;

  const set = {};
  // Reset each downstream stage record to pristine pending state.
  // We use arrayFilters so a single $set update touches every matched record.
  const arrayFilters = [];
  downstream.forEach((name, idx) => {
    const ph = `s${idx}`;
    arrayFilters.push({ [`${ph}.name`]: name });
    set[`stages.$[${ph}].status`] = STAGE_STATUS.PENDING;
    set[`stages.$[${ph}].startedAt`] = null;
    set[`stages.$[${ph}].completedAt`] = null;
    set[`stages.$[${ph}].approvedAt`] = null;
    set[`stages.$[${ph}].failureReason`] = null;
    set[`stages.$[${ph}].recoverable`] = false;
    set[`stages.$[${ph}].chunkCount`] = 0;
    // retryCount preserved across regenerate so the 3-strike rule isn't
    // bypassed by simply regenerating an upstream stage.
  });
  // Wipe the downstream output fields.
  for (const name of downstream) {
    Object.assign(set, STAGE_OUTPUT_RESET[name] || {});
  }

  return Article.findOneAndUpdate(
    { _id: articleId, workspaceId, deletedAt: null },
    { $set: set },
    { arrayFilters, new: true }
  ).exec();
};

/* ──────────────────────────────────────────────────────────
 *  Bulk init for fresh wizard articles
 * ────────────────────────────────────────────────────────── */

export const buildPendingStages = () =>
  STAGE_NAMES.map((name) => ({
    name,
    status: STAGE_STATUS.PENDING,
    retryCount: 0,
    chunkCount: 0,
  }));
