import { userCanAll, userCanAny } from "#utils/rbacUtil.js";
import { ROLE_SCOPES } from "#constants/roles.js";

/**
 * ============================================================
 *  Permission Middleware
 * ============================================================
 *
 * Use AFTER `protect` (which populates req.user.permissions).
 *
 *   router.post(
 *     "/articles",
 *     protect,
 *     requirePermission("tenant.article:create"),
 *     handler
 *   );
 *
 *   router.delete(
 *     "/users/:id",
 *     protect,
 *     requireAllPermissions(["platform.user:manage", "platform.audit:read"]),
 *     handler
 *   );
 */

/**
 * User must have at least ONE of the given permissions.
 */
export const requirePermission = (perms) => (req, res, next) => {
  if (userCanAny(req.user, perms)) return next();
  return res.error({
    message: "You don't have permission to access this resource",
    statusCode: 403,
  });
};

/**
 * User must have ALL of the given permissions.
 */
export const requireAllPermissions = (perms) => (req, res, next) => {
  if (userCanAll(req.user, perms)) return next();
  return res.error({
    message: "You don't have permission to access this resource",
    statusCode: 403,
  });
};

/**
 * Restrict a route to a particular role scope (platform vs tenant).
 * Used as a defense-in-depth check on /admin/* routes.
 */
export const requireScope = (scope) => (req, res, next) => {
  const userScope = req.user?.roleScope;
  if (userScope === scope) return next();
  // Super admin (wildcard perms) can access anything regardless of scope
  if (req.user?.permissions?.includes("*") && scope === ROLE_SCOPES.PLATFORM) {
    return next();
  }
  return res.error({
    message: "Access denied for your account scope",
    statusCode: 403,
  });
};

/**
 * Convenience wrapper for "this route is super-admin only".
 */
export const requireSuperAdmin = () => (req, res, next) => {
  if (req.user?.permissions?.includes("*")) return next();
  return res.error({
    message: "Super admin access required",
    statusCode: 403,
  });
};
