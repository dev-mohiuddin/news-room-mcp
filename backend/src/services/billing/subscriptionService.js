import {
  findByWorkspaceId as findSubscriptionByWorkspace,
  ensureSubscription,
  rolloverIfDue,
} from "#repositories/subscriptionRepository.js";
import { findPlanByCode } from "#repositories/planRepository.js";
import {
  paginateWorkspacePayments,
  paginateAllPayments,
  findFailedPayments,
  sumPaidRevenueLastMonths,
} from "#repositories/paymentRepository.js";
import { findWorkspaceById } from "#repositories/workspaceRepository.js";
import { getQuotaSnapshot } from "#services/billing/quotaService.js";
import { getPaymentMethodSummary } from "#services/billing/stripeService.js";
import { throwError } from "#utils/throwErrorUtil.js";

/**
 * ============================================================
 *  Subscription Service — DB facade
 * ============================================================
 *
 *  All routes that just READ subscription / invoice state route
 *  through here. Stripe writes (checkout, portal) live in
 *  `stripeService.js`. Webhooks live in `stripeWebhookService.js`.
 */

const monthName = (m) =>
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] || "?";

const planSummary = (plan) =>
  plan
    ? {
        code: plan.code,
        displayName: plan.displayName,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        articleLimit: plan.articleLimit,
      }
    : null;

/* ── User-facing reads ── */

export const getCurrentSubscriptionForWorkspace = async (workspaceId) => {
  const sub = await ensureSubscription(workspaceId);
  if (!sub) throwError("Subscription not found", 404);
  await rolloverIfDue(workspaceId);
  const fresh = await findSubscriptionByWorkspace(workspaceId);
  const plan = await findPlanByCode(fresh.plan);
  const quota = await getQuotaSnapshot(workspaceId);
  const paymentMethod = await getPaymentMethodSummary(workspaceId);

  return {
    subscription: {
      _id: fresh._id,
      plan: fresh.plan,
      status: fresh.status,
      currentPeriodStart: fresh.currentPeriodStart,
      currentPeriodEnd: fresh.currentPeriodEnd,
      cancelAtPeriodEnd: fresh.cancelAtPeriodEnd,
      hasStripeCustomer: Boolean(fresh.stripeCustomerId),
      hasStripeSubscription: Boolean(fresh.stripeSubscriptionId),
    },
    plan: planSummary(plan),
    usage: {
      articlesUsed: fresh.articlesUsedThisPeriod,
      articleLimit: quota.limit, // null = unlimited
    },
    paymentMethod,
  };
};

export const listInvoicesForWorkspace = async (workspaceId, params, filters) => {
  const { items, meta } = await paginateWorkspacePayments(
    workspaceId,
    params,
    filters
  );
  return { items: items.map(toUserInvoiceShape), meta };
};

const toUserInvoiceShape = (p) => ({
  _id: p._id,
  invoiceNumber: p.invoiceNumber,
  description: p.description,
  planDisplayName: p.planDisplayName,
  amountCents: p.amountCents,
  amountUsd: Number((p.amountCents / 100).toFixed(2)),
  amountRefundedCents: p.amountRefundedCents,
  currency: p.currency,
  status: p.status,
  failureMessage: p.failureMessage,
  paidAt: p.paidAt,
  failedAt: p.failedAt,
  refundedAt: p.refundedAt,
  issuedAt: p.issuedAt,
  hostedInvoiceUrl: p.stripeHostedInvoiceUrl,
  invoicePdf: p.stripeInvoicePdf,
  paymentMethodBrand: p.paymentMethodBrand,
  paymentMethodLast4: p.paymentMethodLast4,
  createdAt: p.createdAt,
});

/* ── Admin reads ── */

export const listAllInvoicesForAdmin = async (params, filters) => {
  const { items, meta } = await paginateAllPayments(params, filters);
  return { items: items.map(toAdminInvoiceShape), meta };
};

const toAdminInvoiceShape = (p) => ({
  ...toUserInvoiceShape(p),
  workspace: p.workspaceId
    ? {
        _id: p.workspaceId._id || p.workspaceId,
        name: p.workspaceId.name || null,
        slug: p.workspaceId.slug || null,
      }
    : null,
});

export const listFailedPaymentsForAdmin = async (limit = 5) => {
  const items = await findFailedPayments(limit);
  return items.map((p) => {
    const wsRef =
      p.workspaceId && typeof p.workspaceId === "object"
        ? p.workspaceId
        : null;
    return {
      _id: p._id,
      workspace: wsRef ? { _id: wsRef._id, name: wsRef.name } : null,
      invoiceNumber: p.invoiceNumber,
      amountCents: p.amountCents,
      amountUsd: Number((p.amountCents / 100).toFixed(2)),
      currency: p.currency,
      attemptCount: p.attemptCount,
      failureMessage: p.failureMessage,
      failedAt: p.failedAt,
    };
  });
};

export const getRevenueSummary = async () => {
  const monthly = await sumPaidRevenueLastMonths(6);
  const filled = fillMonthlyGaps(monthly);
  const totalCents = filled.reduce((acc, m) => acc + m.revenueCents, 0);
  const mrrCents = filled[filled.length - 1]?.revenueCents || 0;
  const prevCents = filled[filled.length - 2]?.revenueCents || 0;
  const trendPct =
    prevCents > 0
      ? Number((((mrrCents - prevCents) / prevCents) * 100).toFixed(1))
      : null;
  return {
    monthly: filled.map((m) => ({
      label: `${monthName(m.month)} ${String(m.year).slice(-2)}`,
      year: m.year,
      month: m.month,
      revenueCents: m.revenueCents,
      revenueUsd: m.revenueUsd,
      invoices: m.invoices,
    })),
    totalCents,
    mrrCents,
    arrCents: mrrCents * 12,
    trendPct,
  };
};

const fillMonthlyGaps = (rows) => {
  if (!rows.length) {
    const now = new Date();
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        revenueCents: 0,
        revenueUsd: 0,
        invoices: 0,
      });
    }
    return out;
  }
  const byKey = new Map(
    rows.map((r) => [`${r.year}-${r.month}`, r])
  );
  const out = [];
  const last = rows[rows.length - 1];
  const start = new Date(last.year, last.month - 1, 1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(start.getFullYear(), start.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (byKey.has(k)) out.push(byKey.get(k));
    else
      out.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        revenueCents: 0,
        revenueUsd: 0,
        invoices: 0,
      });
  }
  return out;
};

/* ── Common helper used by controllers ── */
export const requireWorkspace = async (workspaceId) => {
  const ws = await findWorkspaceById(workspaceId);
  if (!ws) throwError("Workspace not found", 404);
  return ws;
};
