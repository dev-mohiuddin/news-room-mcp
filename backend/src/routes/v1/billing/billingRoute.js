import express from "express";

import {
  getMySubscription,
  listMyInvoices,
  checkout,
  portal,
  getAdminBillingSummary,
  listAdminInvoices,
} from "#controllers/billing/billingController.js";

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
  checkoutSchema,
  portalSchema,
  invoicesQuerySchema,
  adminInvoicesQuerySchema,
} from "#validations/billing/billingValidation.js";

export const billingRouter = express.Router();

/* ── Tenant ── */
billingRouter.use("/billing", protect, tenantScope);

billingRouter.get(
  "/billing/subscription",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_BILLING_READ),
  getMySubscription
);

billingRouter.get(
  "/billing/invoices",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_BILLING_READ),
  validate(invoicesQuerySchema),
  listMyInvoices
);

billingRouter.post(
  "/billing/checkout",
  createStrictRateLimiter(15, 5),
  requirePermission(PERMISSIONS.TENANT_BILLING_MANAGE),
  validate(checkoutSchema),
  checkout
);

billingRouter.post(
  "/billing/portal",
  createStrictRateLimiter(15, 5),
  requirePermission(PERMISSIONS.TENANT_BILLING_MANAGE),
  validate(portalSchema),
  portal
);

/* ── Admin ── */
billingRouter.get(
  "/admin/billing/summary",
  protect,
  requirePermission(PERMISSIONS.PLATFORM_BILLING_READ),
  getAdminBillingSummary
);

billingRouter.get(
  "/admin/billing/invoices",
  protect,
  requirePermission(PERMISSIONS.PLATFORM_BILLING_READ),
  validate(adminInvoicesQuerySchema),
  listAdminInvoices
);

export default billingRouter;
