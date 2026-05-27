import express from "express";

import {
  trackArticleView,
  tenantDashboard,
  tenantReport,
  adminDashboard,
  adminReport,
} from "#controllers/analytics/analyticsController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { tenantScope } from "#middlewares/tenantScopeMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createRateLimiter,
  createStrictRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";
import {
  trackViewSchema,
  rangeQuerySchema,
} from "#validations/analytics/analyticsValidation.js";

export const analyticsRouter = express.Router();

/* ──────────────────────────────────────────────────────────
 *  Public view-tracking beacon
 *  Mounted with a very tight rate-limit so a single IP can't
 *  flood inserts. The de-dupe unique index keeps the data
 *  honest even if an attacker bursts past the limit.
 * ────────────────────────────────────────────────────────── */
analyticsRouter.post(
  "/track/view",
  createStrictRateLimiter(60, 5),
  validate(trackViewSchema),
  trackArticleView
);

/* ──────────────────────────────────────────────────────────
 *  Tenant analytics
 * ────────────────────────────────────────────────────────── */
analyticsRouter.use("/analytics", protect, tenantScope);

analyticsRouter.get(
  "/analytics/dashboard",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_ANALYTICS_READ),
  tenantDashboard
);

analyticsRouter.get(
  "/analytics/report",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_ANALYTICS_READ),
  validate(rangeQuerySchema),
  tenantReport
);

/* ──────────────────────────────────────────────────────────
 *  Admin analytics
 * ────────────────────────────────────────────────────────── */
analyticsRouter.get(
  "/admin/analytics/dashboard",
  protect,
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.PLATFORM_ANALYTICS_READ),
  adminDashboard
);

analyticsRouter.get(
  "/admin/analytics/report",
  protect,
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.PLATFORM_ANALYTICS_READ),
  validate(rangeQuerySchema),
  adminReport
);

export default analyticsRouter;
