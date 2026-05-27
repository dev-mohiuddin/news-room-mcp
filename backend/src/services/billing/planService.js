import { logger } from "#utils/logger.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  findPlanByCode,
  findPlanById,
  listActivePlans,
  listAllPlans,
  paginatedPlans,
  createPlan as createPlanRepo,
  updatePlanById,
  deletePlanById,
} from "#repositories/planRepository.js";
import { Subscription } from "#models/subscriptionModel.js";

/**
 * ============================================================
 *  Plan Service
 * ============================================================
 *
 *  Read API used by:
 *    - Public landing page  → listPublicPlans()
 *    - Admin /plans page    → listForAdmin() / paginate
 *    - quotaService         → getPlanByCode() with constants fallback
 *
 *  Write API (admin only):
 *    - createPlan, updatePlan, deletePlan
 *
 *  Guard rails:
 *    - System plan `code` is immutable
 *    - System plans cannot be deleted
 *    - A plan with active subscribers cannot be deleted
 *    - Setting `isActive=false` is the soft-retire path
 */

export const SAFE_FIELDS = [
  "_id",
  "code",
  "displayName",
  "description",
  "monthlyPriceCents",
  "yearlyPriceCents",
  "monthlyPriceUsd",
  "yearlyPriceUsd",
  "currency",
  "articleLimit",
  "teamMembers",
  "features",
  "badge",
  "highlight",
  "cta",
  "isSystem",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt",
];

const toPublicShape = (plan) => {
  if (!plan) return null;
  const obj = plan.toObject ? plan.toObject({ virtuals: true }) : plan;
  return {
    _id: obj._id,
    code: obj.code,
    displayName: obj.displayName,
    description: obj.description,
    monthlyPriceCents: obj.monthlyPriceCents,
    yearlyPriceCents: obj.yearlyPriceCents,
    monthlyPriceUsd: obj.monthlyPriceUsd,
    yearlyPriceUsd: obj.yearlyPriceUsd,
    currency: obj.currency,
    articleLimit: obj.articleLimit,
    articleLimitDisplay: obj.articleLimit === -1 ? null : obj.articleLimit,
    teamMembers: obj.teamMembers,
    teamMembersDisplay: obj.teamMembers === -1 ? null : obj.teamMembers,
    features: obj.features || [],
    badge: obj.badge,
    highlight: !!obj.highlight,
    cta: obj.cta,
    isSystem: !!obj.isSystem,
    isActive: !!obj.isActive,
    sortOrder: obj.sortOrder,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

/**
 * Admin shape — same as public + Stripe linkage. NEVER expose this to
 * unauthenticated routes; price IDs aren't secret but they're admin-only
 * config and shouldn't leak through the marketing endpoint.
 */
const toAdminShape = (plan) => {
  if (!plan) return null;
  const obj = plan.toObject ? plan.toObject({ virtuals: true }) : plan;
  return {
    ...toPublicShape(plan),
    stripePriceIdMonthly: obj.stripePriceIdMonthly || null,
    stripePriceIdYearly: obj.stripePriceIdYearly || null,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Reads
 * ────────────────────────────────────────────────────────── */

export const listPublicPlans = async () => {
  const plans = await listActivePlans();
  return plans.map(toPublicShape);
};

export const listForAdminPaginated = async (params, filters) => {
  const { items, meta } = await paginatedPlans(params, filters);
  return { items: items.map(toAdminShape), meta };
};

export const listForAdmin = async () => {
  const plans = await listAllPlans();
  return plans.map(toAdminShape);
};

export const getPlanByCode = async (code) => {
  const plan = await findPlanByCode(code);
  return plan ? toPublicShape(plan) : null;
};

export const getPlan = async (id) => {
  const plan = await findPlanById(id);
  if (!plan) throwError("Plan not found", 404);
  return toAdminShape(plan);
};

/* ──────────────────────────────────────────────────────────
 *  Writes
 * ────────────────────────────────────────────────────────── */

const sanitizeFeatures = (features) => {
  if (!Array.isArray(features)) return [];
  return features
    .filter((f) => f && typeof f === "object" && typeof f.label === "string")
    .map((f) => ({
      key: f.key ? String(f.key).slice(0, 40) : null,
      label: String(f.label).trim().slice(0, 200),
      included: f.included !== false,
    }))
    .filter((f) => f.label.length > 0);
};

const buildWritePayload = (input, { isCreate }) => {
  const out = {};

  if (isCreate) {
    if (!input.code) throwError("Plan code is required", 400);
    out.code = String(input.code).toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(out.code)) {
      throwError(
        "Plan code must be lowercase alphanumeric with dashes/underscores",
        400
      );
    }
  }

  if (input.displayName !== undefined) {
    if (!String(input.displayName).trim()) throwError("displayName required", 400);
    out.displayName = String(input.displayName).trim().slice(0, 80);
  }
  if (input.description !== undefined) {
    out.description = String(input.description || "").trim().slice(0, 500);
  }

  if (input.monthlyPriceCents !== undefined) {
    out.monthlyPriceCents = Math.max(0, Math.round(Number(input.monthlyPriceCents)));
  } else if (input.monthlyPriceUsd !== undefined) {
    out.monthlyPriceCents = Math.max(0, Math.round(Number(input.monthlyPriceUsd) * 100));
  }
  if (input.yearlyPriceCents !== undefined) {
    out.yearlyPriceCents = Math.max(0, Math.round(Number(input.yearlyPriceCents)));
  } else if (input.yearlyPriceUsd !== undefined) {
    out.yearlyPriceCents = Math.max(0, Math.round(Number(input.yearlyPriceUsd) * 100));
  }

  if (input.currency !== undefined) {
    out.currency = String(input.currency).toUpperCase().slice(0, 3) || "USD";
  }

  if (input.articleLimit !== undefined) {
    const n = Number(input.articleLimit);
    if (!Number.isFinite(n) || n < -1) throwError("articleLimit invalid", 400);
    out.articleLimit = Math.trunc(n);
  }
  if (input.teamMembers !== undefined) {
    const n = Number(input.teamMembers);
    if (!Number.isFinite(n) || n < -1) throwError("teamMembers invalid", 400);
    out.teamMembers = Math.trunc(n);
  }

  if (input.features !== undefined) {
    out.features = sanitizeFeatures(input.features);
  }
  if (input.badge !== undefined) out.badge = input.badge ? String(input.badge).slice(0, 40) : null;
  if (input.cta !== undefined) out.cta = input.cta ? String(input.cta).slice(0, 60) : null;
  if (input.highlight !== undefined) out.highlight = !!input.highlight;
  if (input.isActive !== undefined) out.isActive = !!input.isActive;
  if (input.sortOrder !== undefined) out.sortOrder = Math.trunc(Number(input.sortOrder) || 0);

  // Stripe placeholders — accepted but never required for now.
  if (input.stripePriceIdMonthly !== undefined) {
    out.stripePriceIdMonthly = input.stripePriceIdMonthly || null;
  }
  if (input.stripePriceIdYearly !== undefined) {
    out.stripePriceIdYearly = input.stripePriceIdYearly || null;
  }

  return out;
};

export const createPlan = async ({ actor, input, req }) => {
  const exists = await findPlanByCode(input.code || "");
  if (exists) throwError("A plan with this code already exists", 409);

  const payload = buildWritePayload(input, { isCreate: true });
  payload.isSystem = false; // admin-created plans are never system plans

  if (payload.monthlyPriceCents == null) payload.monthlyPriceCents = 0;
  if (payload.yearlyPriceCents == null) payload.yearlyPriceCents = 0;
  if (payload.articleLimit == null) payload.articleLimit = 0;
  if (payload.teamMembers == null) payload.teamMembers = 1;
  if (!payload.displayName) {
    payload.displayName = payload.code.charAt(0).toUpperCase() + payload.code.slice(1);
  }

  const plan = await createPlanRepo(payload);
  logger.info(`[plans] created plan ${plan.code}`);

  await logAudit({
    actor,
    category: "billing",
    action: "plan.created",
    entityType: "plan",
    entityId: plan._id,
    after: { code: plan.code, monthlyPriceCents: plan.monthlyPriceCents },
    req,
  });

  return toAdminShape(plan);
};

export const updatePlan = async ({ id, actor, input, req }) => {
  const existing = await findPlanById(id);
  if (!existing) throwError("Plan not found", 404);

  // Code is immutable — silently strip it from input.
  // (Changing a code would orphan every Subscription that references it.)
  if (input.code && input.code !== existing.code) {
    throwError("Plan code cannot be changed", 400);
  }

  // System plans: still editable for marketing/pricing/limits, but not
  // deletable and the `isSystem` flag is locked.
  const payload = buildWritePayload(input, { isCreate: false });
  if (existing.isSystem) {
    delete payload.code;
  }

  const updated = await updatePlanById(id, payload);

  await logAudit({
    actor,
    category: "billing",
    action: "plan.updated",
    entityType: "plan",
    entityId: updated._id,
    before: { code: existing.code, monthlyPriceCents: existing.monthlyPriceCents },
    after: payload,
    req,
  });

  logger.info(`[plans] updated plan ${updated.code}`);
  return toAdminShape(updated);
};

const countActiveSubscribers = (planCode) =>
  Subscription.countDocuments({
    plan: planCode,
    status: { $in: ["active", "trialing", "past_due"] },
  }).exec();

export const deletePlan = async ({ id, actor, req }) => {
  const existing = await findPlanById(id);
  if (!existing) throwError("Plan not found", 404);
  if (existing.isSystem) {
    throwError(
      "System plans cannot be deleted. Deactivate them instead.",
      403
    );
  }

  const subscribers = await countActiveSubscribers(existing.code);
  if (subscribers > 0) {
    throwError(
      `Cannot delete — ${subscribers} active subscription(s) reference this plan. Migrate them first or deactivate the plan instead.`,
      409
    );
  }

  await deletePlanById(id);
  await logAudit({
    actor,
    category: "billing",
    action: "plan.deleted",
    entityType: "plan",
    entityId: existing._id,
    before: { code: existing.code },
    req,
  });
  logger.info(`[plans] deleted plan ${existing.code}`);
  return { ok: true };
};

export const setPlanActive = async ({ id, actor, isActive, req }) => {
  const existing = await findPlanById(id);
  if (!existing) throwError("Plan not found", 404);

  const updated = await updatePlanById(id, { isActive: !!isActive });
  await logAudit({
    actor,
    category: "billing",
    action: isActive ? "plan.activated" : "plan.deactivated",
    entityType: "plan",
    entityId: updated._id,
    before: { isActive: existing.isActive },
    after: { isActive: updated.isActive },
    req,
  });
  return toAdminShape(updated);
};
