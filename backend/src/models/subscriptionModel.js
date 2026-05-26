import mongoose from "mongoose";
import { ALL_PLAN_NAMES, PLAN_NAMES } from "#constants/plans.js";

/**
 * Subscription = single source of truth for plan + quota.
 *
 * One Subscription per Workspace (enforced by unique index).
 * Created automatically alongside every workspace.
 *
 * Fields that flow into HTTP 402 (`QUOTA_EXCEEDED`) responses:
 *   plan, articlesUsedThisPeriod, currentPeriodEnd
 *
 * For MVP, periods are 30-day windows anchored at workspace creation.
 * Stripe-driven period rollover lands in a later spec.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ALL_PLAN_NAMES,
      required: true,
      default: PLAN_NAMES.FREE,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled"],
      default: "active",
      index: true,
    },

    /* ── Billing window ── */
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
      index: true,
    },

    /* ── Usage counters ── */
    articlesUsedThisPeriod: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ── Stripe linkage (populated when billing integration ships) ── */
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null, index: true, sparse: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

// Helpful for analytics: workspace + plan + period lookups.
subscriptionSchema.index({ workspaceId: 1, plan: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });
// Active billing period rollover scan: find subs whose period has elapsed
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
// Stripe customer reverse-lookup (webhook handlers will hit this hot)
subscriptionSchema.index(
  { stripeCustomerId: 1 },
  { sparse: true, partialFilterExpression: { stripeCustomerId: { $type: "string" } } }
);
// Plan-based aggregations for admin analytics (count active subs per plan)
subscriptionSchema.index({ plan: 1, status: 1 });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
