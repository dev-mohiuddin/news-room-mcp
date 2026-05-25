import {
  findRoleById,
  findRoleByName,
  listRoles,
  paginatedRoles,
  createRole as createRoleRepo,
  updateRoleById,
  deleteRoleById,
  countUsersWithRole,
} from "#repositories/roleRepository.js";

import {
  PERMISSION_CATALOG,
  ROLE_SCOPES,
  PERMISSIONS,
} from "#constants/roles.js";
import {
  sanitizePermissions,
  filterPermissionsByScope,
} from "#utils/rbacUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logger } from "#utils/logger.js";
import { logAudit } from "#utils/auditLogger.js";

/**
 * ============================================================
 *  Role Service
 * ============================================================
 *
 * Business rules:
 *  - PLATFORM scope is dynamic — admins can create/update/delete (super_admin only)
 *  - TENANT scope is static — listed but never mutable from API
 *  - `isStatic` roles cannot be edited or deleted
 *  - `isSystem` roles cannot be deleted
 *  - A role with assigned users cannot be deleted (must reassign first)
 *  - Role names are unique and lowercase snake_case
 *  - Wildcard "*" can never be granted via API (super_admin only)
 */

/**
 * Returns the permission catalog used by the picker UI.
 * Filtered by scope so the picker only shows relevant groups.
 */
export const getPermissionCatalog = (scope) => {
  if (scope === ROLE_SCOPES.PLATFORM) return { platform: PERMISSION_CATALOG.platform };
  if (scope === ROLE_SCOPES.TENANT) return { tenant: PERMISSION_CATALOG.tenant };
  return PERMISSION_CATALOG;
};

/* ──────────────────────────────────────────────────────────
 *  List
 * ────────────────────────────────────────────────────────── */
export const listAllRoles = (filter = {}) => listRoles(filter);

export const listRolesPaginated = async (params, options = {}) => {
  return paginatedRoles(params, options);
};

export const getRoleById = async (id) => {
  const role = await findRoleById(id);
  if (!role) throwError("Role not found", 404);
  return role;
};

/* ──────────────────────────────────────────────────────────
 *  Create — only PLATFORM dynamic roles can be created from API
 * ────────────────────────────────────────────────────────── */
export const createRole = async ({ name, displayName, description, scope, permissions, createdBy, actor, req }) => {
  if (scope !== ROLE_SCOPES.PLATFORM) {
    throwError("Only platform roles can be created. Tenant roles are static.", 400);
  }

  const exists = await findRoleByName(name);
  if (exists) throwError("A role with this name already exists", 409);

  // Sanitize: drop wildcard, drop unknown perms, restrict to scope
  const cleaned = filterPermissionsByScope(
    permissions.filter((p) => p !== PERMISSIONS.ALL),
    scope
  );
  const { valid, invalid } = sanitizePermissions(cleaned);
  if (invalid.length) {
    throwError(`Invalid permissions: ${invalid.join(", ")}`, 400);
  }
  if (valid.length === 0) {
    throwError("At least one valid permission is required", 400);
  }

  const role = await createRoleRepo({
    name,
    displayName,
    description: description || "",
    scope,
    permissions: valid,
    isSystem: false,
    isStatic: false,
    isDefault: false,
    createdBy,
  });

  logger.info(`Role created: ${role.name}`, { id: role._id, by: createdBy });
  await logAudit({
    actor,
    category: "role",
    action: "role.created",
    entityType: "role",
    entityId: role._id,
    after: { name: role.name, permissions: role.permissions },
    req,
  });
  return role;
};

/* ──────────────────────────────────────────────────────────
 *  Update — only non-static platform roles
 * ────────────────────────────────────────────────────────── */
export const updateRole = async (id, { displayName, description, permissions }, { actor, req } = {}) => {
  const role = await findRoleById(id);
  if (!role) throwError("Role not found", 404);
  if (role.isStatic) {
    throwError("Static roles cannot be edited. Modify constants/roles.js to change them.", 403);
  }

  const updates = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (description !== undefined) updates.description = description;

  if (permissions !== undefined) {
    const cleaned = filterPermissionsByScope(
      permissions.filter((p) => p !== PERMISSIONS.ALL),
      role.scope
    );
    const { valid, invalid } = sanitizePermissions(cleaned);
    if (invalid.length) {
      throwError(`Invalid permissions: ${invalid.join(", ")}`, 400);
    }
    if (valid.length === 0) {
      throwError("At least one valid permission is required", 400);
    }
    updates.permissions = valid;
  }

  const updated = await updateRoleById(id, updates);
  logger.info(`Role updated: ${updated.name}`, { id: updated._id });
  await logAudit({
    actor,
    category: "role",
    action: "role.updated",
    entityType: "role",
    entityId: updated._id,
    before: { displayName: role.displayName, permissions: role.permissions },
    after: updates,
    req,
  });
  return updated;
};

/* ──────────────────────────────────────────────────────────
 *  Delete — only non-system, non-static, no users assigned
 * ────────────────────────────────────────────────────────── */
export const deleteRole = async (id, { actor, req } = {}) => {
  const role = await findRoleById(id);
  if (!role) throwError("Role not found", 404);

  if (role.isSystem || role.isStatic) {
    throwError("System or static roles cannot be deleted.", 403);
  }

  const inUse = await countUsersWithRole(id);
  if (inUse > 0) {
    throwError(
      `Cannot delete — ${inUse} user(s) are assigned to this role. Reassign them first.`,
      409
    );
  }

  await deleteRoleById(id);
  logger.info(`Role deleted: ${role.name}`, { id: role._id });
  await logAudit({
    actor,
    category: "role",
    action: "role.deleted",
    entityType: "role",
    entityId: role._id,
    before: { name: role.name, permissions: role.permissions },
    req,
  });
  return { deleted: true };
};
