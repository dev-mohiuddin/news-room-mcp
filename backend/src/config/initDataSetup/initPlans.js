import { logger } from "#utils/logger.js";
import { upsertSystemPlan } from "#repositories/planRepository.js";
import {
  PLAN_NAMES,
  PLAN_METADATA,
  PLAN_ARTICLE_LIMITS,
} from "#constants/plans.js";

/**
 * ============================================================
 *  Plan seeder — idempotent
 * ============================================================
 *
 *  Mirrors the static catalog in `constants/plans.js` into Mongo on
 *  every boot. Pricing/feature edits made via the admin panel are
 *  preserved — the seeder only syncs catalog-driven fields
 *  (displayName, description, limits, sortOrder).
 *
 *  See `planRepository.upsertSystemPlan` for the merge rules.
 *
 *  Run order: must come AFTER `migrateWorkspacePlan` so any legacy
 *  plan codes get normalized first.
 */

const SYSTEM_PLAN_DEFAULTS = [
  {
    code: PLAN_NAMES.FREE,
    sortOrder: 1,
    description: "Try it out, no credit card required.",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    cta: "Start free",
    badge: null,
    highlight: false,
    features: [
      { key: "articles", label: "10 articles / month", included: true },
      { key: "wordpress", label: "WordPress publishing", included: true },
      { key: "users", label: "1 user", included: true },
      { key: "seo_basic", label: "Basic SEO tools", included: true },
      { key: "support", label: "Community support", included: true },
    ],
  },
  {
    code: PLAN_NAMES.STARTER,
    sortOrder: 2,
    description: "For solo publishers ready to scale.",
    monthlyPriceCents: 1900,
    yearlyPriceCents: 1500 * 12,
    cta: "Start free trial",
    badge: "Most popular",
    highlight: true,
    features: [
      { key: "articles", label: "50 articles / month", included: true },
      { key: "cms", label: "WordPress + Ghost", included: true },
      { key: "users", label: "1 user", included: true },
      { key: "seo_full", label: "Full SEO suite", included: true },
      { key: "support", label: "Priority email support", included: true },
    ],
  },
  {
    code: PLAN_NAMES.PRO,
    sortOrder: 3,
    description: "For growing teams and agencies.",
    monthlyPriceCents: 4900,
    yearlyPriceCents: 3900 * 12,
    cta: "Start free trial",
    badge: null,
    highlight: false,
    features: [
      { key: "articles", label: "200 articles / month", included: true },
      { key: "cms", label: "All CMS platforms", included: true },
      { key: "users", label: "Up to 5 users", included: true },
      { key: "brand", label: "Brand voice profiles", included: true },
      { key: "team", label: "Team collaboration", included: true },
      { key: "analytics", label: "Analytics dashboard", included: true },
    ],
  },
  {
    code: PLAN_NAMES.AGENCY,
    sortOrder: 4,
    description: "For high-volume agencies and white-label resellers.",
    monthlyPriceCents: 9900,
    yearlyPriceCents: 7900 * 12,
    cta: "Contact sales",
    badge: null,
    highlight: false,
    features: [
      { key: "articles", label: "Unlimited articles", included: true },
      { key: "cms", label: "All CMS + white label", included: true },
      { key: "users", label: "Unlimited users", included: true },
      { key: "models", label: "Custom AI models", included: true },
      { key: "support", label: "Dedicated support", included: true },
      { key: "sla", label: "SLA guarantee", included: true },
    ],
  },
];

const buildSyncPayload = (defaults) => {
  const meta = PLAN_METADATA[defaults.code];
  const limit = PLAN_ARTICLE_LIMITS[defaults.code];
  return {
    displayName: meta?.displayName || defaults.code,
    description: defaults.description,
    monthlyPriceCents: defaults.monthlyPriceCents,
    yearlyPriceCents: defaults.yearlyPriceCents,
    currency: "USD",
    articleLimit: Number.isFinite(limit) ? limit : -1, // Infinity → -1
    teamMembers: Number.isFinite(meta?.teamMembers) ? meta.teamMembers : -1,
    features: defaults.features,
    badge: defaults.badge,
    highlight: defaults.highlight,
    cta: defaults.cta,
    sortOrder: defaults.sortOrder,
    isSystem: true,
    isActive: true,
  };
};

export const initPlans = async () => {
  let created = 0;
  let synced = 0;
  for (const defaults of SYSTEM_PLAN_DEFAULTS) {
    const payload = buildSyncPayload(defaults);
    const result = await upsertSystemPlan(defaults.code, payload);
    if (result.created) created++;
    else synced++;
  }
  logger.info("[init] plans seeded", { created, synced });
};

export default initPlans;
