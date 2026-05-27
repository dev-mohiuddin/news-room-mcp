import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";

import {
  createCheckoutSession,
  createBillingPortalSession,
  resolveActorIdentity,
  isStripeConfigured,
} from "#services/billing/stripeService.js";
import {
  getCurrentSubscriptionForWorkspace,
  listInvoicesForWorkspace,
  listAllInvoicesForAdmin,
  listFailedPaymentsForAdmin,
  getRevenueSummary,
  requireWorkspace,
} from "#services/billing/subscriptionService.js";

/* ──────────────────────────────────────────────────────────
 *  Tenant-facing — /api/v1/billing/*
 * ────────────────────────────────────────────────────────── */

/* GET /billing/subscription */
export const getMySubscription = catchAsync(async (req, res) => {
  const data = await getCurrentSubscriptionForWorkspace(req.tenant.workspaceId);
  res.success({
    data: { ...data, stripeConfigured: isStripeConfigured() },
    message: "Subscription",
  });
});

/* GET /billing/invoices */
export const listMyInvoices = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["createdAt", "amountCents", "paidAt"],
  });
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  const { items, meta } = await listInvoicesForWorkspace(
    req.tenant.workspaceId,
    params,
    filters
  );
  res.success({
    data: items,
    pagination: meta,
    message: "Invoices",
  });
});

/* POST /billing/checkout */
export const checkout = catchAsync(async (req, res) => {
  const workspace = await requireWorkspace(req.tenant.workspaceId);
  const actor = await resolveActorIdentity(req);
  if (!actor) throwError("Authentication required", 401);

  const session = await createCheckoutSession({
    workspace,
    user: actor,
    planCode: req.body.planCode,
    billingCycle: req.body.billingCycle || "monthly",
  });
  res.success({
    statusCode: 201,
    data: session,
    message: "Checkout session created",
  });
});

/* POST /billing/portal */
export const portal = catchAsync(async (req, res) => {
  const workspace = await requireWorkspace(req.tenant.workspaceId);
  const actor = await resolveActorIdentity(req);
  if (!actor) throwError("Authentication required", 401);

  const session = await createBillingPortalSession({ workspace, user: actor });
  res.success({
    statusCode: 201,
    data: session,
    message: "Portal session created",
  });
});

/* ──────────────────────────────────────────────────────────
 *  Admin — /api/v1/admin/billing/*
 * ────────────────────────────────────────────────────────── */

/* GET /admin/billing/summary */
export const getAdminBillingSummary = catchAsync(async (_req, res) => {
  const revenue = await getRevenueSummary();
  const failedPayments = await listFailedPaymentsForAdmin(5);
  res.success({
    data: {
      stripeConfigured: isStripeConfigured(),
      revenue,
      failedPayments,
    },
    message: "Billing summary",
  });
});

/* GET /admin/billing/invoices */
export const listAdminInvoices = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["createdAt", "amountCents", "paidAt"],
  });
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.workspaceId) filters.workspaceId = req.query.workspaceId;
  const { items, meta } = await listAllInvoicesForAdmin(params, filters);
  res.success({
    data: items,
    pagination: meta,
    message: "Invoices",
  });
});
