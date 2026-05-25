import {
  findUserById,
  paginatedUsers,
  updateUserById,
  deleteUserById,
  countSuperAdmins,
} from "#repositories/userRepository.js";
import { findRoleById, findRoleByName } from "#repositories/roleRepository.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import { ROLE_NAMES } from "#constants/roles.js";

/* ──────────────────────────────────────────────────────────
 *  Helpers — invariants and self-protection
 * ────────────────────────────────────────────────────────── */
const ensureNotSelf = (actor, targetId, action) => {
  if (actor.id === targetId.toString()) {
    throwError(`You cannot ${action} your own account`, 400);
  }
};

const ensureNotLastSuperAdmin = async (target, actionLabel) => {
  const superAdminRole = await findRoleByName(ROLE_NAMES.SUPER_ADMIN);
  if (!superAdminRole) return;
  const isCurrentlySuper = target.roleId?._id?.toString() === superAdminRole._id.toString();
  if (!isCurrentlySuper) return;

  const totalActive = await countSuperAdmins();
  if (totalActive <= 1) {
    throwError(
      `Cannot ${actionLabel} the last active super admin. Promote another user first.`,
      400
    );
  }
};

/* ──────────────────────────────────────────────────────────
 *  List / Get
 * ────────────────────────────────────────────────────────── */
export const listUsers = async (params, filters = {}) => {
  return paginatedUsers(params, filters);
};

export const getUserById = async (id) => {
  const user = await findUserById(id);
  if (!user) throwError("User not found", 404);
  return user;
};

/* ──────────────────────────────────────────────────────────
 *  Change role
 * ────────────────────────────────────────────────────────── */
export const changeUserRole = async ({ actor, userId, roleId, req }) => {
  ensureNotSelf(actor, userId, "change the role of");

  const target = await findUserById(userId);
  if (!target) throwError("User not found", 404);

  const newRole = await findRoleById(roleId);
  if (!newRole) throwError("Role not found", 404);

  // Scope alignment — a tenant user cannot become a platform user without
  // an explicit migration. Block the cross-scope move from this endpoint.
  const currentScope = target.roleId?.scope;
  if (currentScope && currentScope !== newRole.scope) {
    throwError(
      `Cannot change role across scopes (${currentScope} → ${newRole.scope}). Use a dedicated migration tool.`,
      400
    );
  }

  // If demoting a super_admin, ensure another exists
  await ensureNotLastSuperAdmin(target, "demote");

  const before = {
    roleId: target.roleId?._id,
    role: target.roleId?.name,
  };

  const updated = await updateUserById(userId, { roleId: newRole._id });

  await logAudit({
    actor,
    category: "user",
    action: "user.role_changed",
    entityType: "user",
    entityId: updated._id,
    workspaceId: updated.workspaceId,
    before,
    after: { roleId: newRole._id, role: newRole.name },
    req,
  });

  return updated;
};

/* ──────────────────────────────────────────────────────────
 *  Suspend / Activate
 * ────────────────────────────────────────────────────────── */
export const setUserActive = async ({ actor, userId, isActive, req }) => {
  ensureNotSelf(actor, userId, isActive ? "activate" : "suspend");

  const target = await findUserById(userId);
  if (!target) throwError("User not found", 404);

  if (!isActive) {
    await ensureNotLastSuperAdmin(target, "suspend");
  }

  const updated = await updateUserById(userId, { isActive });

  await logAudit({
    actor,
    category: "user",
    action: isActive ? "user.activated" : "user.suspended",
    entityType: "user",
    entityId: updated._id,
    workspaceId: updated.workspaceId,
    before: { isActive: target.isActive },
    after: { isActive },
    req,
  });

  return updated;
};

/* ──────────────────────────────────────────────────────────
 *  Delete
 * ────────────────────────────────────────────────────────── */
export const deleteUser = async ({ actor, userId, req }) => {
  ensureNotSelf(actor, userId, "delete");

  const target = await findUserById(userId);
  if (!target) throwError("User not found", 404);

  await ensureNotLastSuperAdmin(target, "delete");

  await deleteUserById(userId);

  await logAudit({
    actor,
    category: "user",
    action: "user.deleted",
    entityType: "user",
    entityId: userId,
    workspaceId: target.workspaceId,
    before: {
      email: target.email,
      role: target.roleId?.name,
    },
    after: null,
    req,
  });

  return { deleted: true };
};
