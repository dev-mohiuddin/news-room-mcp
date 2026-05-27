import { Payment } from "#models/paymentModel.js";
import { paginateModel } from "#utils/paginationUtil.js";

/**
 * ============================================================
 *  Payment Repository
 * ============================================================
 *
 *  All upserts keyed by `stripeInvoiceId` so webhook re-deliveries
 *  are idempotent. Workspace scope is applied when known but is not
 *  required for upserts (some Stripe events arrive before the
 *  customer-id reverse-lookup is hot).
 */

export const paginateWorkspacePayments = (workspaceId, params, filters = {}) => {
  const baseQuery = { workspaceId };
  if (filters.status) baseQuery.status = filters.status;
  return paginateModel(Payment, baseQuery, params, {
    searchFields: ["invoiceNumber", "description", "planDisplayName"],
  });
};

export const paginateAllPayments = (params, filters = {}) => {
  const baseQuery = {};
  if (filters.status) baseQuery.status = filters.status;
  if (filters.workspaceId) baseQuery.workspaceId = filters.workspaceId;
  return paginateModel(Payment, baseQuery, params, {
    searchFields: ["invoiceNumber", "description", "planDisplayName"],
    populate: [{ path: "workspaceId", select: "name slug ownerId" }],
  });
};

export const findFailedPayments = (limit = 10) =>
  Payment.find({ status: "failed" })
    .sort({ failedAt: -1, createdAt: -1 })
    .limit(limit)
    .populate("workspaceId", "name slug ownerId")
    .exec();

export const upsertByStripeInvoiceId = async (stripeInvoiceId, set) =>
  Payment.findOneAndUpdate(
    { stripeInvoiceId },
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();

export const findByStripeInvoiceId = (stripeInvoiceId) =>
  Payment.findOne({ stripeInvoiceId }).exec();

export const sumPaidRevenueLastMonths = async (months = 6) => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  cutoff.setDate(1);
  cutoff.setHours(0, 0, 0, 0);

  const rows = await Payment.aggregate([
    { $match: { status: "paid", paidAt: { $gte: cutoff } } },
    {
      $group: {
        _id: {
          year: { $year: "$paidAt" },
          month: { $month: "$paidAt" },
        },
        revenueCents: { $sum: { $subtract: ["$amountCents", "$amountRefundedCents"] } },
        invoices: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]).exec();

  return rows.map((r) => ({
    year: r._id.year,
    month: r._id.month,
    revenueCents: Math.max(0, r.revenueCents),
    revenueUsd: Number((Math.max(0, r.revenueCents) / 100).toFixed(2)),
    invoices: r.invoices,
  }));
};

export const countByStatus = async () => {
  const rows = await Payment.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]).exec();
  return rows.reduce((acc, r) => {
    acc[r._id] = r.count;
    return acc;
  }, {});
};
