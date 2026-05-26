/**
 * ============================================================
 *  Newsroom MCP — Plan Catalog (Single Source of Truth)
 * ============================================================
 *
 * Per-plan article-generation limits per monthly billing window.
 *
 * Per Requirement 12: read plan / period start / period end / usage
 * ONLY from the `Subscription` document. Workspace.plan is removed.
 *
 * Per Requirement 11 & NFR8.3: this module is the canonical map.
 * No other file may hardcode plan limits.
 */

export const PLAN_NAMES = {
  FREE: "free",
  STARTER: "starter",
  PRO: "pro",
  AGENCY: "agency",
};

/**
 * Article generation limits per monthly window.
 * `agency` is `Number.POSITIVE_INFINITY` in code; serialized as `null` on the wire.
 */
export const PLAN_ARTICLE_LIMITS = Object.freeze({
  [PLAN_NAMES.FREE]: 10,
  [PLAN_NAMES.STARTER]: 50,
  [PLAN_NAMES.PRO]: 200,
  [PLAN_NAMES.AGENCY]: Number.POSITIVE_INFINITY,
});

/**
 * Display metadata for plan upgrade prompts (HTTP 402 body, billing UI).
 */
export const PLAN_METADATA = Object.freeze({
  [PLAN_NAMES.FREE]: {
    displayName: "Free",
    monthlyPriceUsd: 0,
    teamMembers: 1,
  },
  [PLAN_NAMES.STARTER]: {
    displayName: "Starter",
    monthlyPriceUsd: 19,
    teamMembers: 1,
  },
  [PLAN_NAMES.PRO]: {
    displayName: "Pro",
    monthlyPriceUsd: 49,
    teamMembers: 5,
  },
  [PLAN_NAMES.AGENCY]: {
    displayName: "Agency",
    monthlyPriceUsd: 99,
    teamMembers: Number.POSITIVE_INFINITY,
  },
});

export const ALL_PLAN_NAMES = Object.freeze(Object.values(PLAN_NAMES));

/**
 * Resolve the article limit for a plan name.
 * Throws when an unknown plan is encountered — callers must catch and
 * map this to a 500 since it indicates corrupted data.
 */
export const getArticleLimit = (planName) => {
  if (!Object.prototype.hasOwnProperty.call(PLAN_ARTICLE_LIMITS, planName)) {
    throw new Error(`Unknown plan: ${planName}`);
  }
  return PLAN_ARTICLE_LIMITS[planName];
};

/**
 * Serialize an article limit for HTTP responses.
 *  - Infinity → null (so JSON renders as `null`, not the string "Infinity")
 *  - everything else → the integer value
 */
export const serializeLimit = (limit) =>
  Number.isFinite(limit) ? limit : null;

/**
 * Compute the monthly window starting at `anchor`.
 * The window length is "one calendar month later", clamped to the last day
 * of the target month when the anchor is e.g. Jan 31 → Feb 28/29.
 */
export const computeMonthlyPeriod = (anchor) => {
  const start = new Date(anchor);
  const end = new Date(start);
  const targetMonth = end.getMonth() + 1;
  end.setMonth(targetMonth);
  // Handle month-end overflow (Jan 31 + 1mo would yield Mar 03 without this)
  if (end.getMonth() !== targetMonth % 12) {
    end.setDate(0);
  }
  return { start, end };
};
