import { ArticleView } from "#models/articleViewModel.js";

/**
 * ============================================================
 *  ArticleView Repository
 * ============================================================
 *
 *  Insert path is bounded by a unique index on
 *  (articleId, visitorHash, dayKey) — duplicate keys silently no-op.
 */

export const insertView = async (doc) => {
  try {
    return await ArticleView.create(doc);
  } catch (err) {
    // Duplicate key => same visitor already counted today. Treat as success.
    if (err?.code === 11000) return null;
    throw err;
  }
};

export const totalViewsForWorkspace = (workspaceId) =>
  ArticleView.countDocuments({ workspaceId }).exec();

export const dailyViewsForWorkspace = async (workspaceId, days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const rows = await ArticleView.aggregate([
    { $match: { workspaceId, createdAt: { $gte: cutoff } } },
    {
      $group: {
        _id: "$dayKey",
        views: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]).exec();
  return rows.map((r) => ({ day: r._id, views: r.views }));
};

export const dailyViewsForArticle = async (articleId, days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const rows = await ArticleView.aggregate([
    { $match: { articleId, createdAt: { $gte: cutoff } } },
    {
      $group: {
        _id: "$dayKey",
        views: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]).exec();
  return rows.map((r) => ({ day: r._id, views: r.views }));
};

export const trafficSourcesForWorkspace = async (workspaceId, days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rows = await ArticleView.aggregate([
    { $match: { workspaceId, createdAt: { $gte: cutoff } } },
    {
      $group: { _id: "$referrer", value: { $sum: 1 } },
    },
  ]).exec();
  return rows.map((r) => ({ source: r._id, value: r.value }));
};

export const dailyViewsCrossTenant = async (days = 14) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const rows = await ArticleView.aggregate([
    { $match: { createdAt: { $gte: cutoff } } },
    { $group: { _id: "$dayKey", views: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).exec();
  return rows.map((r) => ({ day: r._id, views: r.views }));
};

/**
 * Atomic counter bump on the parent article. Called immediately after a
 * successful `insertView` so the article list/cards stay in sync.
 */
export const bumpArticleCounters = async (articleId) => {
  const { Article } = await import("#models/articleModel.js");
  return Article.updateOne(
    { _id: articleId },
    {
      $inc: { viewsTotal: 1, viewsLast30d: 1 },
      $set: { lastViewedAt: new Date() },
    }
  ).exec();
};
