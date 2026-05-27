import {
  totalUsers,
  activeUsers,
  totalWorkspaces,
  totalActiveSubscriptions,
  dailyNewSignups,
  monthlyActiveUsers,
  dailyActiveUsers,
  planDistribution,
  recentSignupsEnriched,
} from "#repositories/platformAnalyticsRepository.js";
import {
  totalArticlesCrossTenant,
  platformArticleStatusCounts,
  dailyArticlesCrossTenant,
  platformCostsByWorkspace,
  recentArticlesCrossTenant,
} from "#repositories/articleAnalyticsRepository.js";
import { dailyViewsCrossTenant } from "#repositories/articleViewRepository.js";
import {
  getRevenueSummary,
  listFailedPaymentsForAdmin,
} from "#services/billing/subscriptionService.js";

/**
 * ============================================================
 *  Platform Analytics Service
 * ============================================================
 *
 *  Powers `/admin/dashboard` and `/admin/analytics`. Composes:
 *    - User counts (total, active, MAU, DAU)
 *    - Article counts and 30-day trend
 *    - Plan distribution donut
 *    - Revenue summary (reused from billing)
 *    - Failed payments alert (reused from billing)
 *    - Cost ledger by workspace
 *    - Recent signups + recent articles widgets
 */

const fillDays = (rows, days, key = "value") => {
  const map = new Map(rows.map((r) => [r.day, r]));
  const out = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().slice(0, 10);
    const found = map.get(dayKey);
    if (found) out.push(found);
    else out.push({ day: dayKey, [key]: 0 });
  }
  return out;
};

const sumLast = (rows, key, n) =>
  rows.slice(-n).reduce((acc, r) => acc + (r[key] || 0), 0);

const computeTrend = (rows, key) => {
  if (rows.length < 14) return null;
  const recent = sumLast(rows, key, 7);
  const prev = rows.slice(-14, -7).reduce((a, r) => a + (r[key] || 0), 0);
  if (prev === 0) return recent > 0 ? 100 : 0;
  return Number((((recent - prev) / prev) * 100).toFixed(1));
};

export const getPlatformDashboardSummary = async () => {
  const [
    users,
    active,
    workspaces,
    subs,
    articles,
    statusCounts,
    daily14,
    revenue,
    failedPayments,
    plans,
    recentSignups,
    recentArticles,
  ] = await Promise.all([
    totalUsers(),
    activeUsers(),
    totalWorkspaces(),
    totalActiveSubscriptions(),
    totalArticlesCrossTenant(),
    platformArticleStatusCounts(),
    dailyArticlesCrossTenant(14),
    getRevenueSummary(),
    listFailedPaymentsForAdmin(5),
    planDistribution(),
    recentSignupsEnriched(8),
    recentArticlesCrossTenant(8),
  ]);

  const filled = fillDays(daily14, 14, "articles").map((r) => ({
    day: r.day,
    articles: r.articles ?? 0,
    published: r.published ?? 0,
  }));

  return {
    counts: {
      users,
      activeUsers: active,
      workspaces,
      activeSubscriptions: subs,
      articles,
      ...statusCounts,
    },
    articlesTrendPct: computeTrend(filled, "articles"),
    daily14d: filled,
    revenue, // { monthly[], totalCents, mrrCents, arrCents, trendPct }
    failedPayments,
    planDistribution: plans,
    recentSignups,
    recentArticles: recentArticles.map((a) => ({
      _id: a._id,
      title: a.seo?.metaTitle || a.topic,
      status: a.status,
      wordCount: a.wordCount || 0,
      createdAt: a.createdAt,
      cmsPostUrl: a.cmsPostUrl || null,
      workspace: a.workspaceId
        ? { _id: a.workspaceId._id, name: a.workspaceId.name, slug: a.workspaceId.slug }
        : null,
      author: a.createdBy
        ? { _id: a.createdBy._id, name: a.createdBy.name, email: a.createdBy.email }
        : null,
    })),
  };
};

export const getPlatformAnalyticsReport = async ({ range = "30d" } = {}) => {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const [
    mau,
    dau,
    signups,
    articlesDaily,
    viewsDaily,
    revenue,
    plans,
    statusCounts,
    costsByWs,
    totalArticlesCount,
  ] = await Promise.all([
    monthlyActiveUsers(),
    dailyActiveUsers(),
    dailyNewSignups(days),
    dailyArticlesCrossTenant(days),
    dailyViewsCrossTenant(days),
    getRevenueSummary(),
    planDistribution(),
    platformArticleStatusCounts(),
    platformCostsByWorkspace(10),
    totalArticlesCrossTenant(),
  ]);

  const filledSignups = fillDays(signups, days, "users").map((r) => ({
    day: r.day,
    users: r.users ?? 0,
  }));
  const filledArticles = fillDays(articlesDaily, days, "articles").map(
    (r) => ({
      day: r.day,
      articles: r.articles ?? 0,
      published: r.published ?? 0,
    })
  );
  const filledViews = fillDays(viewsDaily, days, "views").map((r) => ({
    day: r.day,
    views: r.views ?? 0,
  }));

  return {
    range,
    days,
    summary: {
      mau,
      dau,
      totalArticles: totalArticlesCount,
      published: statusCounts.published || 0,
      signupsTrendPct: computeTrend(filledSignups, "users"),
      articlesTrendPct: computeTrend(filledArticles, "articles"),
      viewsTrendPct: computeTrend(filledViews, "views"),
    },
    daily: {
      signups: filledSignups,
      articles: filledArticles,
      views: filledViews,
    },
    revenue,
    planDistribution: plans,
    costsByWorkspace: costsByWs,
  };
};
