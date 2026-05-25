import { User } from "#models/userModel.js";
import { paginateModel } from "#utils/paginationUtil.js";

const POPULATE_ROLE = {
  path: "roleId",
  select: "_id name displayName scope permissions isSystem isStatic",
};

/* ── Read ── */

export const findUserById = (id, opts = {}) => {
  const q = User.findById(id);
  if (opts.populateRole !== false) q.populate(POPULATE_ROLE);
  if (opts.includePassword) q.select("+password");
  return q.exec();
};

export const findUserByEmail = (email, opts = {}) => {
  const q = User.findOne({ email });
  if (opts.populateRole !== false) q.populate(POPULATE_ROLE);
  if (opts.includePassword) q.select("+password");
  return q.exec();
};

export const findUserByGoogleId = (googleId, opts = {}) => {
  const q = User.findOne({ googleId });
  if (opts.populateRole !== false) q.populate(POPULATE_ROLE);
  return q.exec();
};

export const findUserByPasswordResetToken = (hashedToken) =>
  User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  })
    .select("+passwordResetToken +passwordResetExpires")
    .exec();

/**
 * Paginated user list — used by /admin/users.
 * Optional filters: scope (platform/tenant), status, workspaceId.
 */
export const paginatedUsers = (params, { scope, isActive, workspaceId } = {}) => {
  const baseQuery = {};
  if (typeof isActive === "boolean") baseQuery.isActive = isActive;
  if (workspaceId) baseQuery.workspaceId = workspaceId;

  return paginateModel(User, baseQuery, params, {
    searchFields: ["name", "email"],
    populate: POPULATE_ROLE,
  }).then(async ({ items, meta }) => {
    if (scope) {
      const filtered = items.filter((u) => u.roleId?.scope === scope);
      return { items: filtered, meta };
    }
    return { items, meta };
  });
};

export const listWorkspaceMembers = (workspaceId) =>
  User.find({ workspaceId })
    .populate(POPULATE_ROLE)
    .sort({ createdAt: 1 })
    .exec();

export const countSuperAdmins = async () => {
  const { Role } = await import("#models/roleModel.js");
  const superAdminRole = await Role.findOne({ name: "super_admin" });
  if (!superAdminRole) return 0;
  return User.countDocuments({ roleId: superAdminRole._id, isActive: true });
};

/* ── Write ── */

export const createUser = (data) => User.create(data);

export const updateUserById = (id, data) =>
  User.findByIdAndUpdate(id, data, { new: true })
    .populate(POPULATE_ROLE)
    .exec();

export const updateLastLogin = (id) =>
  User.findByIdAndUpdate(id, { lastLoginAt: new Date() }).exec();

export const setPasswordResetToken = (id, hashedToken, expiresAt) =>
  User.findByIdAndUpdate(id, {
    passwordResetToken: hashedToken,
    passwordResetExpires: expiresAt,
  }).exec();

export const clearPasswordResetToken = (id) =>
  User.findByIdAndUpdate(id, {
    passwordResetToken: null,
    passwordResetExpires: null,
  }).exec();

export const deleteUserById = (id) => User.findByIdAndDelete(id).exec();
