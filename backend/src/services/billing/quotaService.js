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
import { findPlanByCode } from "#repositories/planRepository.js";
import {
  QuotaExceededError,
  SubscriptionMissingError,
} from "#utils/pipelineErrors.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Quota service — Requirement 11 + 12
 * ============================================================
 *
 *  Plan resolution order (DB-first with safe fallback):
 *    1. Plan document keyed by `subscription.plan` code → use its
 *       `articleLimit` and display name. (Source of truth post-Task 2.)
 *    2. If the DB row is missing (first boot before init seed runs,
 *       custom plan that disappeared, etc.), fall back to the static
 *       `constants/plans.js` catalog so the app keeps working.
 *
 *  Article-generation flow:
 *    1. checkAndReserve() — verifies limit, atomically increments usage
 *    2. on stage failure → refund() (decrement, clamped to 0)
 *
 *  Every call auto-rolls the period if currentPeriodEnd ≤ now.
 */

export const getActiveSubscription = async (workspaceId) => {
  const sub = await ensureSubscription(workspaceId);
  if (!sub) throw new SubscriptionMissingError(workspaceId);
  return rolloverIfDue(workspaceId);
};

/**
 * Resolves limit + display name from DB first, falls back to static
 * constants. Returns a normalized snapshot for HTTP responses.
 *
 * Internally accepts -1 as the unlimited sentinel (DB) and POSITIVE_INFINITY
 * as the sentinel from constants/plans.js — both are normalized to a
 * single `wireLimit` (number | null on the wire).
 */
const resolvePlanShape = async (planCode) => {
  // 1. DB first
  try {
    const dbPlan = await findPlanByCode(planCode);
    if (dbPlan) {
      const rawLimit = dbPlan.articleLimit;
      const isUnlimited = rawLimit === -1;
      return {
        source: "db",
        displayName: dbPlan.displayName,
        rawLimit: isUnlimited ? Number.POSITIVE_INFINITY : rawLimit,
        wireLimit: isUnlimited ? null : rawLimit,
        teamMembers:
          dbPlan.teamMembers === -1
            ? null
            : dbPlan.teamMembers,
      };
    }
  } catch (err) {
    logger.warn("[quota] DB plan lookup failed, falling back to constants", {
      planCode,
      message: err.message,
    });
  }

  // 2. Constants fallback
  const meta = PLAN_METADATA[planCode];
  if (!meta) {
    // Unknown plan — refuse rather than silently grant infinite quota.
    throw new SubscriptionMissingError(`unknown plan code '${planCode}'`);
  }
  const rawLimit = getArticleLimit(planCode);
  return {
    source: "constants",
    displayName: meta.displayName,
    rawLimit,
    wireLimit: serializeLimit(rawLimit),
    teamMembers: Number.isFinite(meta.teamMembers) ? meta.teamMembers : null,
  };
};

export const getQuotaSnapshot = async (workspaceId) => {
  const sub = await getActiveSubscription(workspaceId);
  const shape = await resolvePlanShape(sub.plan);
  const used = sub.articlesUsedThisPeriod;
  const remaining = Number.isFinite(shape.rawLimit)
    ? Math.max(0, shape.rawLimit - used)
    : null;
  return {
    plan: sub.plan,
    planDisplayName: shape.displayName,
    limit: shape.wireLimit,
    used,
    remaining,
    teamMembers: shape.teamMembers,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    source: shape.source,
  };
};

/**
 * Atomic: verify the workspace has remaining quota AND increment usage.
 * Returns the post-increment subscription doc.
 */
export const checkAndReserve = async (workspaceId) => {
  const sub = await getActiveSubscription(workspaceId);
  const shape = await resolvePlanShape(sub.plan);

  // Agency / unlimited still increments for analytics (Req 11.6)
  if (
    Number.isFinite(shape.rawLimit) &&
    sub.articlesUsedThisPeriod >= shape.rawLimit
  ) {
    throw new QuotaExceededError({
      plan: sub.plan,
      limit: shape.wireLimit,
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
