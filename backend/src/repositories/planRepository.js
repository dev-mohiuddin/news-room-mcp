import { Plan } from "#models/planModel.js";
import { paginateModel } from "#utils/paginationUtil.js";

/* ── Reads ── */

export const findPlanByCode = (code) =>
  Plan.findOne({ code: String(code).toLowerCase() }).exec();

export const findPlanById = (id) => Plan.findById(id).exec();

export const listActivePlans = () =>
  Plan.find({ isActive: true })
    .sort({ sortOrder: 1, monthlyPriceCents: 1 })
    .exec();

export const listAllPlans = () =>
  Plan.find()
    .sort({ sortOrder: 1, monthlyPriceCents: 1 })
    .exec();

export const paginatedPlans = (params, { isActive } = {}) => {
  const baseQuery = {};
  if (typeof isActive === "boolean") baseQuery.isActive = isActive;
  return paginateModel(Plan, baseQuery, params, {
    searchFields: ["code", "displayName", "description"],
  });
};

/* ── Writes ── */

export const createPlan = (data) => Plan.create(data);

export const updatePlanById = (id, data) =>
  Plan.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();

export const deletePlanById = (id) => Plan.findByIdAndDelete(id).exec();

/**
 * Used by the seeder — upsert by `code` so existing rows keep their `_id`.
 * Returns { plan, created } so the caller can audit-log accurately.
 */
export const upsertSystemPlan = async (code, payload) => {
  const existing = await Plan.findOne({ code }).exec();
  if (!existing) {
    const plan = await Plan.create({ ...payload, code, isSystem: true });
    return { plan, created: true };
  }

  // Sync only catalog-driven fields. NEVER overwrite admin-tweaked
  // pricing or stripe IDs on system plans, but keep limits/features/display
  // in sync with constants/plans.js so deploys can update marketing copy.
  const dirty = {};
  if (existing.displayName !== payload.displayName) dirty.displayName = payload.displayName;
  if (existing.description !== payload.description) dirty.description = payload.description;
  if (existing.articleLimit !== payload.articleLimit) dirty.articleLimit = payload.articleLimit;
  if (existing.teamMembers !== payload.teamMembers) dirty.teamMembers = payload.teamMembers;
  if (existing.sortOrder !== payload.sortOrder) dirty.sortOrder = payload.sortOrder;
  if (!existing.isSystem) dirty.isSystem = true;
  if (existing.isActive === undefined) dirty.isActive = true;

  if (Object.keys(dirty).length === 0) {
    return { plan: existing, created: false };
  }

  const updated = await Plan.findByIdAndUpdate(existing._id, dirty, {
    new: true,
  }).exec();
  return { plan: updated, created: false };
};

export const countPlans = () => Plan.estimatedDocumentCount().exec();
