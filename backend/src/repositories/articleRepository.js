import { Article } from "#models/articleModel.js";
import { paginateModel } from "#utils/paginationUtil.js";
import {
  isValidTransition,
  isTerminal,
  ARTICLE_STATUS,
} from "#constants/articleStatus.js";
import {
  StatusTransitionRaceError,
  InvalidStatusTransitionError,
  MissingTenantScopeError,
} from "#utils/pipelineErrors.js";

/**
 * ============================================================
 *  Article Repository — Requirement 14, 15, 18
 * ============================================================
 *
 *  Every method requires `workspaceId`. The Tenant_Scope middleware
 *  populates `req.tenant.workspaceId` and call sites pass it through.
 *
 *  Status changes go through `transitionStatus()` exclusively —
 *  it performs a single CAS update and refuses transitions that
 *  are not in the allowed table.
 */

const requireScope = (workspaceId, method) => {
  if (!workspaceId) throw new MissingTenantScopeError(method);
};

/* ── Reads ────────────────────────────────────────────────── */

export const findArticleById = (workspaceId, id, { includeDeleted = false } = {}) => {
  requireScope(workspaceId, "findArticleById");
  const filter = { _id: id, workspaceId };
  if (!includeDeleted) filter.deletedAt = null;
  return Article.findOne(filter).exec();
};

export const findActiveArticleById = (workspaceId, id) =>
  findArticleById(workspaceId, id, { includeDeleted: false });

export const paginatedArticles = (workspaceId, params, filters = {}) => {
  requireScope(workspaceId, "paginatedArticles");
  const baseQuery = { workspaceId, deletedAt: null };
  if (filters.status) baseQuery.status = filters.status;
  if (filters.tag) baseQuery["seo.tags"] = filters.tag;
  if (filters.dateFrom || filters.dateTo) {
    baseQuery.createdAt = {};
    if (filters.dateFrom) baseQuery.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) baseQuery.createdAt.$lte = new Date(filters.dateTo);
  }

  return paginateModel(Article, baseQuery, params, {
    searchFields: ["topic", "targetKeyword", "seo.metaTitle", "title"],
  });
};

/* ── Writes ───────────────────────────────────────────────── */

export const createArticle = async (workspaceId, payload) => {
  requireScope(workspaceId, "createArticle");
  return Article.create({ ...payload, workspaceId });
};

/**
 * Atomic compare-and-swap status transition — Requirement 14.3.
 *
 * @param {Object} args
 * @param {ObjectId|String} args.workspaceId
 * @param {ObjectId|String} args.articleId
 * @param {String} args.from   - expected current status
 * @param {String} args.to     - target status
 * @param {String} [args.reason]
 * @param {Object} [args.set]  - extra fields to persist atomically with the transition
 *
 * Throws:
 *  - InvalidStatusTransitionError if (from, to) is not in the allowed table
 *  - StatusTransitionRaceError if the CAS update found no document
 */
export const transitionStatus = async ({
  workspaceId,
  articleId,
  from,
  to,
  reason = null,
  set = {},
}) => {
  requireScope(workspaceId, "transitionStatus");

  if (!isValidTransition(from, to)) {
    throw new InvalidStatusTransitionError(from, to);
  }

  const update = {
    $set: { status: to, ...set },
    $push: {
      statusHistory: { from, to, at: new Date(), reason },
    },
  };

  const updated = await Article.findOneAndUpdate(
    {
      _id: articleId,
      workspaceId,
      status: from,
    },
    update,
    { new: true }
  ).exec();

  if (!updated) {
    throw new StatusTransitionRaceError(
      `Expected article ${articleId} status='${from}' but CAS lost`
    );
  }
  return updated;
};

/**
 * Convenience: mark an article failed with reason — used by stages
 * after exhausting retries or hitting fatal errors.
 */
export const markFailed = ({ workspaceId, articleId, from, reason }) =>
  transitionStatus({
    workspaceId,
    articleId,
    from,
    to: ARTICLE_STATUS.FAILED,
    reason,
    set: { failureReason: reason },
  });

/**
 * Generic field set scoped by workspace.
 * Refuses to mutate `status` (must go through transitionStatus).
 */
export const updateArticleFields = async (workspaceId, id, set) => {
  requireScope(workspaceId, "updateArticleFields");
  if (set.status) {
    throw new Error("Use transitionStatus() to change article status");
  }
  return Article.findOneAndUpdate(
    { _id: id, workspaceId, deletedAt: null },
    { $set: set },
    { new: true }
  ).exec();
};

export const softDeleteArticle = (workspaceId, id) => {
  requireScope(workspaceId, "softDeleteArticle");
  return Article.findOneAndUpdate(
    { _id: id, workspaceId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  ).exec();
};

export const restoreArticle = (workspaceId, id) => {
  requireScope(workspaceId, "restoreArticle");
  return Article.findOneAndUpdate(
    { _id: id, workspaceId, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true }
  ).exec();
};

export const findExistingSlug = (workspaceId, slug) => {
  requireScope(workspaceId, "findExistingSlug");
  return Article.findOne({
    workspaceId,
    "seo.slug": slug,
    deletedAt: null,
  }).exec();
};

/**
 * Force-mark an article as failed regardless of its current state — used
 * for manual cancel and emergency overrides. Bypasses the strict CAS
 * transition table because the user-issued cancel may target any active
 * stage, but the directed graph does not include all `<stage> → failed`
 * edges. This still writes a status-history entry for traceability.
 */
export const forceMarkFailed = async (workspaceId, id, reason) => {
  requireScope(workspaceId, "forceMarkFailed");
  const article = await Article.findOne({ _id: id, workspaceId, deletedAt: null }).exec();
  if (!article) return null;
  const fromStatus = article.status;
  return Article.findOneAndUpdate(
    { _id: id, workspaceId },
    {
      $set: {
        status: ARTICLE_STATUS.FAILED,
        failureReason: reason || "MANUAL_CANCEL",
      },
      $push: {
        statusHistory: {
          from: fromStatus,
          to: ARTICLE_STATUS.FAILED,
          at: new Date(),
          reason: reason || "MANUAL_CANCEL",
        },
      },
    },
    { new: true }
  ).exec();
};

/* ── Cost helper ──────────────────────────────────────────── */

export const appendCostStage = async (workspaceId, id, entry) => {
  requireScope(workspaceId, "appendCostStage");
  return Article.findOneAndUpdate(
    { _id: id, workspaceId },
    { $push: { "costs.stages": entry } },
    { new: true }
  ).exec();
};

export const setCostsTotal = async (workspaceId, id, totalUsd) => {
  requireScope(workspaceId, "setCostsTotal");
  return Article.updateOne(
    { _id: id, workspaceId },
    { $set: { "costs.totalUsd": totalUsd } }
  ).exec();
};

/* ── Idempotent publish guard (Requirement 9.2) ───────────── */

export const claimPublish = async (workspaceId, id) => {
  requireScope(workspaceId, "claimPublish");
  return Article.findOneAndUpdate(
    {
      _id: id,
      workspaceId,
      status: ARTICLE_STATUS.DRAFT_READY,
      cmsPostId: null,
    },
    {
      $set: { status: ARTICLE_STATUS.PUBLISHING },
      $push: {
        statusHistory: {
          from: ARTICLE_STATUS.DRAFT_READY,
          to: ARTICLE_STATUS.PUBLISHING,
          at: new Date(),
          reason: "publish:claim",
        },
      },
    },
    { new: true }
  ).exec();
};

/* ── Helpers used by the worker ───────────────────────────── */

export const isArticleTerminal = (article) =>
  Boolean(article && isTerminal(article.status));

/* ── Platform-side (super admin moderation) — bypasses workspace scope ── */

/**
 * Cross-tenant article listing for super admins. Accepts the same pagination
 * shape as `paginatedArticles` and populates workspace + author for the UI.
 */
export const paginatedAllArticles = (params, filters = {}) => {
  const baseQuery = { deletedAt: null };
  if (filters.status) baseQuery.status = filters.status;
  if (filters.workspaceId) baseQuery.workspaceId = filters.workspaceId;
  if (filters.flagged) baseQuery["moderation.flagged"] = true;
  if (filters.hidden) baseQuery["moderation.hidden"] = true;

  return paginateModel(Article, baseQuery, params, {
    searchFields: ["topic", "targetKeyword", "seo.metaTitle"],
    populate: [
      { path: "workspaceId", select: "name ownerId" },
      { path: "createdBy", select: "name email" },
    ],
  });
};

export const setArticleHidden = async (id, hidden, actorId) => {
  const set = hidden
    ? {
        "moderation.hidden": true,
        "moderation.hiddenAt": new Date(),
        "moderation.hiddenBy": actorId || null,
      }
    : {
        "moderation.hidden": false,
        "moderation.hiddenAt": null,
        "moderation.hiddenBy": null,
      };
  return Article.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: set },
    { new: true }
  )
    .populate("workspaceId", "name")
    .populate("createdBy", "name email")
    .exec();
};

export const setArticleFlagged = async (id, flagged, reason, actorId) => {
  const set = flagged
    ? {
        "moderation.flagged": true,
        "moderation.flagReason": reason || null,
        "moderation.flaggedAt": new Date(),
        "moderation.flaggedBy": actorId || null,
      }
    : {
        "moderation.flagged": false,
        "moderation.flagReason": null,
        "moderation.flaggedAt": null,
        "moderation.flaggedBy": null,
      };
  return Article.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: set },
    { new: true }
  )
    .populate("workspaceId", "name")
    .populate("createdBy", "name email")
    .exec();
};
