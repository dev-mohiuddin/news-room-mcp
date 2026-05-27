import { Subscription } from "#models/subscriptionModel.js";
import {
  PLAN_NAMES,
  computeMonthlyPeriod,
} from "#constants/plans.js";

/**
 * ============================================================
 *  Subscription Repository
 * ============================================================
 *
 *  All quota math and plan reads go through here. Higher-level callers
 *  use `quotaService.js` rather than this repo directly.
 */

export const findByWorkspaceId = (workspaceId) =>
  Subscription.findOne({ workspaceId }).exec();

/**
 * Idempotent "ensure" — returns the existing subscription or creates a
 * fresh `free` plan subscription anchored at `now` (or a supplied anchor).
 */
export const ensureSubscription = async (
  workspaceId,
  { anchor = new Date(), plan = PLAN_NAMES.FREE } = {}
) => {
  const existing = await Subscription.findOne({ workspaceId }).exec();
  if (existing) return existing;

  const { start, end } = computeMonthlyPeriod(anchor);
  return Subscription.create({
    workspaceId,
    plan,
    status: "active",
    currentPeriodStart: start,
    currentPeriodEnd: end,
    articlesUsedThisPeriod: 0,
  });
};

/**
 * Atomic period roll — Requirement 11 criterion 5.
 * If currentPeriodEnd ≤ now, advance to the next monthly window AND
 * reset articlesUsedThisPeriod to 0. Done in a single update with a
 * `$expr` filter so we never double-roll.
 */
export const rolloverIfDue = async (workspaceId, { now = new Date() } = {}) => {
  const sub = await Subscription.findOne({ workspaceId }).exec();
  if (!sub) return null;
  if (sub.currentPeriodEnd > now) return sub;

  // Anchor the next window to the existing periodEnd to keep the cycle stable.
  const { start, end } = computeMonthlyPeriod(sub.currentPeriodEnd);

  const updated = await Subscription.findOneAndUpdate(
    {
      _id: sub._id,
      currentPeriodEnd: sub.currentPeriodEnd, // CAS
    },
    {
      $set: {
        currentPeriodStart: start,
        currentPeriodEnd: end,
        articlesUsedThisPeriod: 0,
      },
    },
    { new: true }
  ).exec();

  // If CAS lost (concurrent rollover by a sibling process) re-read.
  return updated || Subscription.findOne({ workspaceId }).exec();
};

/**
 * Atomic increment — Requirement 11 criterion 3.
 * Returns the post-increment usage count so the caller can decide whether
 * a slot was actually consumed.
 */
export const incrementUsage = async (workspaceId, { delta = 1 } = {}) => {
  const updated = await Subscription.findOneAndUpdate(
    { workspaceId },
    { $inc: { articlesUsedThisPeriod: delta } },
    { new: true }
  ).exec();
  return updated;
};

/**
 * Atomic decrement clamped at 0 — Requirement 11 criterion 4.
 * Mongo doesn't support `$max` against an `$inc` source in one op, so we
 * do a two-stage update: try the decrement, then clamp negatives to 0.
 */
export const decrementUsage = async (workspaceId, { delta = 1 } = {}) => {
  const decremented = await Subscription.findOneAndUpdate(
    { workspaceId, articlesUsedThisPeriod: { $gt: 0 } },
    { $inc: { articlesUsedThisPeriod: -delta } },
    { new: true }
  ).exec();

  // Floor to 0 if a race left us negative.
  if (decremented?.articlesUsedThisPeriod < 0) {
    await Subscription.updateOne(
      { _id: decremented._id, articlesUsedThisPeriod: { $lt: 0 } },
      { $set: { articlesUsedThisPeriod: 0 } }
    ).exec();
    decremented.articlesUsedThisPeriod = 0;
  }
  return decremented;
};

export const updatePlan = (workspaceId, planName) =>
  Subscription.findOneAndUpdate(
    { workspaceId },
    { $set: { plan: planName } },
    { new: true }
  ).exec();

/**
 * Persist Stripe linkage. Called by webhook handlers after a checkout
 * completes or a subscription updates. Accepts a partial set so each
 * webhook only touches the fields it actually knows about.
 */
export const updateStripeLinkage = (workspaceId, set) =>
  Subscription.findOneAndUpdate(
    { workspaceId },
    { $set: set },
    { new: true }
  ).exec();

export const findByStripeCustomerId = (stripeCustomerId) =>
  Subscription.findOne({ stripeCustomerId }).exec();

export const findByStripeSubscriptionId = (stripeSubscriptionId) =>
  Subscription.findOne({ stripeSubscriptionId }).exec();

/**
 * Move a Subscription onto a new plan code AND reset the period to the
 * Stripe-driven dates. Called by the `customer.subscription.updated`
 * webhook when the user upgrades/downgrades.
 */
export const applyPlanChange = (workspaceId, { plan, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd }) =>
  Subscription.findOneAndUpdate(
    { workspaceId },
    {
      $set: {
        ...(plan ? { plan } : {}),
        ...(status ? { status } : {}),
        ...(currentPeriodStart ? { currentPeriodStart } : {}),
        ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
        ...(typeof cancelAtPeriodEnd === "boolean"
          ? { cancelAtPeriodEnd }
          : {}),
      },
    },
    { new: true }
  ).exec();
