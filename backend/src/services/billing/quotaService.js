import {
  ensureSubscription,
  rolloverIfDue,
  incrementUsage,
  decrementUsage,
} from "#repositories/subscriptionRepository.js";
import {
  getArticleLimit,
  serializeLimit,
  PLAN_METADATA,
} from "#constants/plans.js";
import { QuotaExceededError, SubscriptionMissingError } from "#utils/pipelineErrors.js";

/**
 * ============================================================
 *  Quota service — Requirement 11 + 12
 * ============================================================
 *
 *  All plan + usage reads go through here. Topic submission calls:
 *    1. checkAndReserve()  — verifies limit, atomically increments usage
 *    2. on stage failure → refund() (decrement, clamped to 0)
 *
 *  Every call auto-rolls the period if currentPeriodEnd ≤ now.
 */

export const getActiveSubscription = async (workspaceId) => {
  const sub = await ensureSubscription(workspaceId);
  if (!sub) throw new SubscriptionMissingError(workspaceId);
  return rolloverIfDue(workspaceId);
};

export const getQuotaSnapshot = async (workspaceId) => {
  const sub = await getActiveSubscription(workspaceId);
  const limit = getArticleLimit(sub.plan);
  const used = sub.articlesUsedThisPeriod;
  return {
    plan: sub.plan,
    planDisplayName: PLAN_METADATA[sub.plan]?.displayName || sub.plan,
    limit: serializeLimit(limit),
    used,
    remaining: Number.isFinite(limit) ? Math.max(0, limit - used) : null,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
  };
};

/**
 * Atomic: verify the workspace has remaining quota AND increment usage in
 * a single update operation. Returns the post-increment subscription doc
 * so the caller can persist `quotaIncrementApplied = true` on the article.
 */
export const checkAndReserve = async (workspaceId) => {
  const sub = await getActiveSubscription(workspaceId);
  const limit = getArticleLimit(sub.plan);

  // Agency = unlimited but we still increment for analytics (Req 11.6)
  if (Number.isFinite(limit) && sub.articlesUsedThisPeriod >= limit) {
    throw new QuotaExceededError({
      plan: sub.plan,
      limit: serializeLimit(limit),
      used: sub.articlesUsedThisPeriod,
      currentPeriodEnd: sub.currentPeriodEnd,
      upgradeUrl: "/dashboard/billing",
    });
  }

  const incremented = await incrementUsage(workspaceId);
  return {
    subscription: incremented,
    incrementApplied: true,
  };
};

/**
 * Used when a generation job ends with status="failed".
 * Refunds the previously reserved slot, clamped at zero.
 */
export const refund = async (workspaceId) => {
  return decrementUsage(workspaceId);
};
