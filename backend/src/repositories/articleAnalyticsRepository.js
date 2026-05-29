import { Article } from "#models/articleModel.js";
import { MissingTenantScopeError } from "#utils/pipelineErrors.js";

/**
 * ============================================================
 *  ArticleAnalytics Repository
 * ============================================================
 *
 *  Read-only aggregation queries — kept separate from articleRepository
 *  so the pipeline writes path stays small. All time-windowed queries
 *  use createdAt / publishedAt with deleted=null filtering.
 */

const requireScope = (workspaceId, method) => {
  if (!workspaceId) throw new MissingTenantScopeError(method);
};

const ymd = (d) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* ── Workspace scope ── */

export const dailyArticlesForWorkspace = async (workspaceId, days = 30) => {
  requireScope(workspaceId, "dailyArticlesForWorkspace");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const rows = await Article.aggregate([
    { $match: { workspaceId, createdAt: { $gte: cutoff }, deletedAt: null } },
    {
      $group: {
        _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
        articles: { $sum: 1 },
        published: {
          $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]).exec();
  return rows.map((r) => ({
    day: r._id,
    articles: r.articles,
    published: r.published,
  }));
};

export const articleStatusCounts = async (workspaceId) => {
  requireScope(workspaceId, "articleStatusCounts");
  const rows = await Article.aggregate([
    { $match: { workspaceId, deletedAt: null } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]).exec();
  const out = {};
  for (const r of rows) out[r._id] = r.count;
  return out;
};

export const seoScoreDistribution = async (workspaceId) => {
  requireScope(workspaceId, "seoScoreDistribution");
  // We don't yet store a numeric seoScore on the Article. Approximate with
  // FAQ count + meta presence + tag count → 0..100. The aggregation runs in
  // Mongo so the API stays fast even with thousands of rows.
  const rows = await Article.aggregate([
    {
      $match: {
        workspaceId,
        deletedAt: null,
        status: { $in: ["draft_ready", "published"] },
      },
    },
    {
      $project: {
        score: {
          $add: [
            { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$seo.metaTitle", ""] } }, 0] }, 20, 0] },
            { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$seo.metaDescription", ""] } }, 0] }, 20, 0] },
            { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$seo.slug", ""] } }, 0] }, 10, 0] },
            { $multiply: [{ $size: { $ifNull: ["$seo.faq", []] } }, 5] },
            { $multiply: [{ $size: { $ifNull: ["$seo.tags", []] } }, 3] },
          ],
        },
      },
    },
    {
      $bucket: {
        groupBy: "$score",
        boundaries: [0, 50, 70, 85, 95, 101],
        default: "low",
        output: { count: { $sum: 1 } },
      },
    },
  ]).exec();
  // Map buckets back to readable labels
  const labels = {
    0: "0-49",
    50: "50-69",
    70: "70-84",
    85: "85-94",
    95: "95-100",
  };
  return rows.map((r) => ({
    band: labels[r._id] ?? "low",
    count: r.count,
  }));
};

export const totalCostsForWorkspace = async (workspaceId) => {
  requireScope(workspaceId, "totalCostsForWorkspace");
  const rows = await Article.aggregate([
    { $match: { workspaceId, deletedAt: null } },
    {
      $group: {
        _id: null,
        totalUsd: { $sum: { $ifNull: ["$costs.totalUsd", 0] } },
        articles: { $sum: 1 },
      },
    },
  ]).exec();
  return rows[0] || { totalUsd: 0, articles: 0 };
};

export const topArticlesByViews = (workspaceId, limit = 10) => {
  requireScope(workspaceId, "topArticlesByViews");
  /**
   * Exclude in-progress articles. The widget's purpose is "top by views",
   * so anything that hasn't reached `draft_ready` (still researching /
   * outlining / drafting / awaiting_approval inside the wizard) cannot
   * have meaningful views and just clutters the list. `needs_revision`
   * is included so authors can see drafts that need their attention.
   */
  return Article.find({
    workspaceId,
    deletedAt: null,
    status: { $in: ["draft_ready", "published", "scheduled", "needs_revision"] },
  })
    .sort({ viewsTotal: -1, createdAt: -1 })
    .limit(limit)
    .select(
      "topic seo.metaTitle seo.slug status viewsTotal viewsLast30d publishedAt cmsPostUrl wordCount readingTimeMinutes"
    )
    .exec();
};

/* ── Platform scope ── */

export const dailyArticlesCrossTenant = async (days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const rows = await Article.aggregate([
    { $match: { createdAt: { $gte: cutoff }, deletedAt: null } },
    {
      $group: {
        _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
        articles: { $sum: 1 },
        published: {
          $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]).exec();
  return rows.map((r) => ({
    day: r._id,
    articles: r.articles,
    published: r.published,
  }));
};

export const totalArticlesCrossTenant = () =>
  Article.countDocuments({ deletedAt: null }).exec();

export const platformArticleStatusCounts = async () => {
  const rows = await Article.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]).exec();
  const out = {};
  for (const r of rows) out[r._id] = r.count;
  return out;
};

export const platformCostsByWorkspace = async (limit = 10) => {
  const rows = await Article.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: "$workspaceId",
        totalUsd: { $sum: { $ifNull: ["$costs.totalUsd", 0] } },
        articles: { $sum: 1 },
      },
    },
    { $sort: { totalUsd: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "workspaces",
        localField: "_id",
        foreignField: "_id",
        as: "workspace",
      },
    },
    { $unwind: { path: "$workspace", preserveNullAndEmptyArrays: true } },
  ]).exec();
  return rows.map((r) => ({
    workspaceId: r._id,
    workspaceName: r.workspace?.name || "Unknown",
    workspaceSlug: r.workspace?.slug || null,
    totalUsd: Number((r.totalUsd || 0).toFixed(4)),
    articles: r.articles,
  }));
};

export const recentArticlesCrossTenant = (limit = 10) =>
  Article.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(
      "topic seo.metaTitle workspaceId createdBy status wordCount createdAt cmsPostUrl"
    )
    .populate("workspaceId", "name slug")
    .populate("createdBy", "name email")
    .exec();

/* ── Helpers ── */
export { ymd };
