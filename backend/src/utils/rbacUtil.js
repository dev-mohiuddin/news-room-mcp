/**
 * ============================================================
 *  RBAC Utility — Newsroom MCP
 * ============================================================
 *
 * Pure helpers (no req/res). Use these inside services.
 * For Express middleware see permissionMiddleware.js.
 */

import { ALL_PERMISSION_KEYS, ROLE_SCOPES } from "#constants/roles.js";

/**
 * Does the user have ALL the given permissions?
 * Wildcard "*" passes everything.
 */
export const userCanAll = (user, perms) => {
  const list = Array.isArray(perms) ? perms : [perms];
  const granted = user?.permissions || [];
  if (granted.includes("*")) return true;
  return list.every((p) => granted.includes(p));
};

/**
 * Does the user have ANY of the given permissions?
 */
export const userCanAny = (user, perms) => {
  const list = Array.isArray(perms) ? perms : [perms];
  const granted = user?.permissions || [];
  if (granted.includes("*")) return true;
  return list.some((p) => granted.includes(p));
};

/**
 * Default check — alias for `userCanAny` (most common case).
 */
export const userCan = userCanAny;

/**
 * Is the user inside the given scope (platform vs tenant)?
 * Use this to keep tenants out of /admin/* routes even if they have
 * matching permission strings.
 */
export const userInScope = (user, scope) => {
  if (!user?.role || !scope) return false;
  // The user object built by `protect` middleware exposes `roleScope`
  // when populated — we fall back to inferring from role name prefix.
  if (user.roleScope) return user.roleScope === scope;
  return false;
};

/**
 * Validate a list of permission strings against the catalog.
 * Returns { valid: [], invalid: [] } so callers can reject bad input.
 */
export const sanitizePermissions = (input = []) => {
  const list = Array.isArray(input) ? input : [];
  const valid = [];
  const invalid = [];

  for (const p of list) {
    if (typeof p !== "string") {
      invalid.push(p);
      continue;
    }
    if (ALL_PERMISSION_KEYS.includes(p)) valid.push(p);
    else invalid.push(p);
  }
  return { valid: [...new Set(valid)], invalid };
};

/**
 * Filter permissions to those that match a given scope.
 * Used when creating a platform role — strips any tenant.* perms.
 */
export const filterPermissionsByScope = (perms = [], scope) => {
  if (scope === ROLE_SCOPES.PLATFORM) {
    return perms.filter((p) => p === "*" || p.startsWith("platform."));
  }
  if (scope === ROLE_SCOPES.TENANT) {
    return perms.filter((p) => p === "*" || p.startsWith("tenant."));
  }
  return perms;
};
