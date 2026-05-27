import mongoose from "mongoose";

/**
 * ============================================================
 *  Payment / Invoice ledger
 * ============================================================
 *
 *  One row per Stripe invoice we observe (paid, failed, refunded).
 *  Source of truth = Stripe; we mirror the data so admin pages /
 *  user invoice list don't have to call Stripe API on every render.
 *
 *  Webhook events that create / update rows:
 *    - invoice.paid            → status: "paid"
 *    - invoice.payment_failed  → status: "failed"
 *    - charge.refunded         → status: "refunded"
 *
 *  All amounts are stored in the smallest currency unit (cents for USD).
 */

export const PAYMENT_STATUSES = ["draft", "open", "paid", "failed", "refunded", "void", "uncollectible"];

const paymentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    /* ── Display fields ── */
    invoiceNumber: { type: String, default: null, index: true, sparse: true },
    description: { type: String, default: null },
    planCode: { type: String, default: null, index: true },
    planDisplayName: { type: String, default: null },

    /* ── Money (integer cents) ── */
    amountCents: { type: Number, required: true, min: 0 },
    amountRefundedCents: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD", uppercase: true, maxlength: 3 },

    /* ── Status ── */
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      default: "open",
      index: true,
    },
    failureMessage: { type: String, default: null },
    attemptCount: { type: Number, default: 0 },

    /* ── Stripe linkage ── */
    stripeInvoiceId: { type: String, default: null, unique: true, sparse: true },
    stripeChargeId: { type: String, default: null, sparse: true },
    stripeCustomerId: { type: String, default: null, index: true, sparse: true },
    stripeSubscriptionId: { type: String, default: null, index: true, sparse: true },
    stripeHostedInvoiceUrl: { type: String, default: null },
    stripeInvoicePdf: { type: String, default: null },
    paymentMethodBrand: { type: String, default: null }, // e.g. "visa"
    paymentMethodLast4: { type: String, default: null },

    /* ── Timestamps ── */
    paidAt: { type: Date, default: null, index: true },
    failedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    issuedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

/* ── Indexes ── */
// Per-workspace invoice list (hot path)
paymentSchema.index({ workspaceId: 1, createdAt: -1 });
// Admin "failed payments" alert
paymentSchema.index({ status: 1, createdAt: -1 });
// Cross-workspace revenue report by month
paymentSchema.index({ paidAt: -1, status: 1 });

/* Virtual USD amount for convenience in API responses. */
paymentSchema.virtual("amountUsd").get(function () {
  return Number((this.amountCents / 100).toFixed(2));
});
paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

export const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
