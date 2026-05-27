import {
  dailyArticlesForWorkspace,
  articleStatusCounts,
  seoScoreDistribution,
  totalCostsForWorkspace,
  topArticlesByViews,
} from "#repositories/articleAnalyticsRepository.js";
import {
  totalViewsForWorkspace,
  dailyViewsForWorkspace,
  trafficSourcesForWorkspace,
} from "#repositories/articleViewRepository.js";
import { getQuotaSnapshot } from "#services/billing/quotaService.js";

/**
 * ============================================================
 *  Workspace Analytics Service
 * ============================================================
 *
 *  Powers `/dashboard/analytics` and `/dashboard` (user dashboard) for
 *  a single workspace. Composes:
 *    - daily articles (created vs published)
 *    - daily views
 *    - traffic-source breakdown
 *    - SEO score distribution
 *    - top articles
 *    - total costs
 *    - quota snapshot
 *    - "hours saved" estimate (roughly 4h per published article)
 */

const HOURS_SAVED_PER_PUBLISHED_ARTICLE = 4;

const fillDays = (rows, key, days, valueKey = "value") => {
  // Fills missing day buckets with 0 so charts have a contiguous x-axis.
  const map = new Map(rows.map((r) => [r[key], r]));
  const out = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().slice(0, 10);
    const found = map.get(dayKey);
    if (found) out.push(found);
    else out.push({ [key]: dayKey, [valueKey]: 0 });
  }
  return out;
};

const sumLast = (rows, key, n) =>
  rows.slice(-n).reduce((acc, r) => acc + (r[key] || 0), 0);

const computeTrend = (rows, key) => {
  if (rows.length < 14) return null;
  const recent = sumLast(rows, key, 7);
  const prev = rows
    .slice(-14, -7)
    .reduce((acc, r) => acc + (r[key] || 0), 0);
  if (prev === 0) return recent > 0 ? 100 : 0;
  return Number((((recent - prev) / prev) * 100).toFixed(1));
};

export const getDashboardSummary = async (workspaceId) => {
  const days = 14;
  const [
    daily,
    statusCounts,
    quota,
    costs,
    top,
    totalViews,
  ] = await Promise.all([
    dailyArticlesForWorkspace(workspaceId, days),
    articleStatusCounts(workspaceId),
    getQuotaSnapshot(workspaceId),
    totalCostsForWorkspace(workspaceId),
    topArticlesByViews(workspaceId, 5),
    totalViewsForWorkspace(workspaceId),
  ]);

  const filled = fillDays(daily, "day", days, "articles").map((r) => ({
    day: r.day,
    articles: r.articles ?? 0,
    published: r.published ?? 0,
  }));

  const articlesThisMonth = sumLast(filled, "articles", days);
  const trend = computeTrend(filled, "articles");

  const publishedCount = statusCounts.published || 0;

  return {
    quota,
    counts: {
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      ...statusCounts,
    },
    daily14d: filled,
    articlesThisMonth,
    articlesTrendPct: trend,
    hoursSaved: publishedCount * HOURS_SAVED_PER_PUBLISHED_ARTICLE,
    totalViews,
    costs: {
      totalUsd: Number((costs.totalUsd || 0).toFixed(4)),
      articles: costs.articles || 0,
    },
    topArticles: top.map((a) => ({
      _id: a._id,
      title: a.seo?.metaTitle || a.topic,
      slug: a.seo?.slug || null,
      status: a.status,
      viewsTotal: a.viewsTotal || 0,
      viewsLast30d: a.viewsLast30d || 0,
      publishedAt: a.publishedAt,
      cmsPostUrl: a.cmsPostUrl || null,
      wordCount: a.wordCount || 0,
      readingTimeMinutes: a.readingTimeMinutes || 0,
    })),
  };
};

export const getAnalyticsReport = async (workspaceId, { range = "30d" } = {}) => {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;

  const [
    dailyArticles,
    dailyViews,
    traffic,
    seoBands,
    statusCounts,
    quota,
    costs,
    top,
    totalViews,
  ] = await Promise.all([
    dailyArticlesForWorkspace(workspaceId, days),
    dailyViewsForWorkspace(workspaceId, days),
    trafficSourcesForWorkspace(workspaceId, days),
    seoScoreDistribution(workspaceId),
    articleStatusCounts(workspaceId),
    getQuotaSnapshot(workspaceId),
    totalCostsForWorkspace(workspaceId),
    topArticlesByViews(workspaceId, 10),
    totalViewsForWorkspace(workspaceId),
  ]);

  const filledArticles = fillDays(dailyArticles, "day", days, "articles").map(
    (r) => ({
      day: r.day,
      articles: r.articles ?? 0,
      published: r.published ?? 0,
    })
  );

  const filledViews = fillDays(dailyViews, "day", days, "views").map((r) => ({
    day: r.day,
    views: r.views ?? 0,
  }));

  return {
    range,
    days,
    summary: {
      totalArticles: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      published: statusCounts.published || 0,
      drafts: (statusCounts.draft_ready || 0) + (statusCounts.draft || 0),
      failed: statusCounts.failed || 0,
      totalViews,
      viewsTrendPct: computeTrend(filledViews, "views"),
      totalCostUsd: Number((costs.totalUsd || 0).toFixed(4)),
      hoursSaved: (statusCounts.published || 0) * HOURS_SAVED_PER_PUBLISHED_ARTICLE,
    },
    quota,
    daily: {
      articles: filledArticles,
      views: filledViews,
    },
    trafficSources: traffic,
    seoBands,
    topArticles: top.map((a) => ({
      _id: a._id,
      title: a.seo?.metaTitle || a.topic,
      slug: a.seo?.slug || null,
      status: a.status,
      viewsTotal: a.viewsTotal || 0,
      viewsLast30d: a.viewsLast30d || 0,
      publishedAt: a.publishedAt,
      cmsPostUrl: a.cmsPostUrl || null,
      wordCount: a.wordCount || 0,
      readingTimeMinutes: a.readingTimeMinutes || 0,
    })),
  };
};
