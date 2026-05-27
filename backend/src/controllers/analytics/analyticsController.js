import { catchAsync } from "#utils/catchAsync.js";
import { trackView } from "#services/analytics/viewTrackingService.js";
import {
  getDashboardSummary,
  getAnalyticsReport,
} from "#services/analytics/workspaceAnalyticsService.js";
import {
  getPlatformDashboardSummary,
  getPlatformAnalyticsReport,
} from "#services/analytics/platformAnalyticsService.js";

/* ─────────────────────────────────────────────────────────────
 *  Public — view tracking pixel / beacon
 * ───────────────────────────────────────────────────────────── */

/* POST /api/v1/track/view */
export const trackArticleView = catchAsync(async (req, res) => {
  const ua = req.headers["user-agent"] || "";
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    null;
  const referrer = req.body?.referrer || req.headers.referer || "";

  const result = await trackView({
    articleId: req.body.articleId,
    ip,
    userAgent: ua,
    referrer,
  });

  // Always 200 — Stripe-style "we received it"; payload tells the client
  // whether it was actually counted.
  res.success({
    statusCode: 200,
    data: result,
    message: result.counted ? "View counted" : "View not counted",
  });
});

/* ─────────────────────────────────────────────────────────────
 *  Tenant — /api/v1/analytics/*
 * ───────────────────────────────────────────────────────────── */

/* GET /analytics/dashboard */
export const tenantDashboard = catchAsync(async (req, res) => {
  const data = await getDashboardSummary(req.tenant.workspaceId);
  res.success({ data, message: "Workspace dashboard summary" });
});

/* GET /analytics/report */
export const tenantReport = catchAsync(async (req, res) => {
  const data = await getAnalyticsReport(req.tenant.workspaceId, {
    range: req.query.range || "30d",
  });
  res.success({ data, message: "Workspace analytics report" });
});

/* ─────────────────────────────────────────────────────────────
 *  Admin — /api/v1/admin/analytics/*
 * ───────────────────────────────────────────────────────────── */

/* GET /admin/analytics/dashboard */
export const adminDashboard = catchAsync(async (_req, res) => {
  const data = await getPlatformDashboardSummary();
  res.success({ data, message: "Platform dashboard summary" });
});

/* GET /admin/analytics/report */
export const adminReport = catchAsync(async (req, res) => {
  const data = await getPlatformAnalyticsReport({
    range: req.query.range || "30d",
  });
  res.success({ data, message: "Platform analytics report" });
});
