import mongoose from "mongoose";

/**
 * ============================================================
 *  Plan Model — DB source of truth for subscription tiers
 * ============================================================
 *
 *  System plans (isSystem=true): seeded on every boot from
 *  `constants/plans.js`. Their `code` is referenced by Subscription
 *  documents — so they can be edited (price, features, limits,
 *  display) but NEVER deleted and the `code` itself is immutable.
 *
 *  Custom plans (isSystem=false): admin-created via /admin/plans.
 *  Full CRUD allowed. Will pair with a Stripe price ID once the
 *  Stripe integration ships.
 *
 *  `articleLimit`: -1 means unlimited. We use -1 over Number.POSITIVE_INFINITY
 *  because Mongo can't index Infinity and JSON serialization would be
 *  inconsistent. The serializer maps -1 → null on the wire.
 *
 *  Price changes affect NEW subscribers only. Existing Subscription docs
 *  carry the plan code, not the price snapshot — meaning a price bump
 *  reflects on the next renewal cycle.
 */

const featureBulletSchema = new mongoose.Schema(
  {
    key: { type: String, default: null }, // optional stable identifier (e.g. "wordpress_publish")
    label: { type: String, required: true, trim: true, maxlength: 200 },
    included: { type: Boolean, default: true },
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    /**
     * Stable, immutable slug. Used by Subscription.plan and frontend route logic.
     * Lowercase snake or kebab; alnum + dashes/underscores only.
     */
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 40,
      match: /^[a-z0-9][a-z0-9_-]*$/,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    /* ── Pricing (stored as integer cents to avoid float drift) ── */
    monthlyPriceCents: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    yearlyPriceCents: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      maxlength: 3,
    },

    /* ── Limits ── */
    articleLimit: {
      type: Number,
      required: true,
      min: -1, // -1 = unlimited
      default: 0,
    },
    teamMembers: {
      type: Number,
      required: true,
      min: -1,
      default: 1,
    },

    /* ── Display ── */
    features: { type: [featureBulletSchema], default: [] },
    badge: { type: String, default: null, trim: true, maxlength: 40 },
    highlight: { type: Boolean, default: false },
    cta: { type: String, default: null, trim: true, maxlength: 60 },

    /* ── Stripe linkage (populated when billing integration ships) ── */
    stripePriceIdMonthly: { type: String, default: null, sparse: true, index: true },
    stripePriceIdYearly: { type: String, default: null, sparse: true, index: true },

    /* ── Lifecycle ── */
    isSystem: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

/* ── Indexes ── */
planSchema.index({ isActive: 1, sortOrder: 1 });
planSchema.index({ sortOrder: 1, monthlyPriceCents: 1 });

/* ── Virtuals (read helpers) ── */
planSchema.virtual("monthlyPriceUsd").get(function () {
  return Number((this.monthlyPriceCents / 100).toFixed(2));
});
planSchema.virtual("yearlyPriceUsd").get(function () {
  return Number((this.yearlyPriceCents / 100).toFixed(2));
});

planSchema.set("toJSON", { virtuals: true });
planSchema.set("toObject", { virtuals: true });

export const Plan = mongoose.model("Plan", planSchema);
export default Plan;
