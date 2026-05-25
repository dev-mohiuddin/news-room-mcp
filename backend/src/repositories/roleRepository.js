import { Role } from "#models/roleModel.js";
import { paginateModel } from "#utils/paginationUtil.js";

/* ── Read ── */
export const findRoleByName = (name) => Role.findOne({ name }).exec();
export const findRoleById = (id) => Role.findById(id).exec();

/**
 * Find the default role for a scope (used at signup).
 *   findDefaultRole("tenant")    → workspace_owner
 *   findDefaultRole("platform")  → super_admin
 */
export const findDefaultRole = (scope = "tenant") =>
  Role.findOne({ scope, isDefault: true }).exec();

export const listRoles = (filter = {}) =>
  Role.find(filter).sort({ scope: 1, isStatic: -1, displayName: 1 }).exec();

/**
 * Paginated list — used by /admin/roles page.
 * Accepts pagination params parsed from req.query.
 */
export const paginatedRoles = async (params, { scope } = {}) => {
  const baseQuery = scope ? { scope } : {};
  return paginateModel(Role, baseQuery, params, {
    searchFields: ["name", "displayName", "description"],
    lean: false,
  });
};

/* ── Write ── */
export const createRole = (data) => Role.create(data);

export const updateRoleById = (id, data) =>
  Role.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();

export const deleteRoleById = (id) => Role.findByIdAndDelete(id).exec();

/**
 * Count users assigned to a role — used to block deletion when in use.
 */
export const countUsersWithRole = async (roleId) => {
  const { User } = await import("#models/userModel.js");
  return User.countDocuments({ roleId });
};
