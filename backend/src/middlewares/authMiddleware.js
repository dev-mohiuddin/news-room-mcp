import { verifyAccessToken } from "#utils/jwtUtil.js";
import { findUserById } from "#repositories/userRepository.js";

/**
 * `protect` — verifies JWT + loads current user from DB.
 *
 * Why DB load instead of just trusting the JWT payload?
 *   - Permissions can change after token issuance (admin updated role)
 *   - Account suspension takes effect immediately
 *   - Email verification status reflects current state
 *
 * Attaches:
 *   req.user = { id, email, role, permissions, isVerified, isActive, ... }
 */
export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.error({ message: "Authentication required", statusCode: 401 });
    }

    const decoded = verifyAccessToken(token);
    const userId = decoded.id || decoded.sub;

    const user = await findUserById(userId);
    if (!user) {
      return res.error({ message: "User not found", statusCode: 401 });
    }
    if (!user.isActive) {
      return res.error({
        message: "Account is suspended. Contact support.",
        statusCode: 403,
      });
    }

    const role = user.roleId;
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: role?.name || null,
      roleId: role?._id?.toString() || null,
      roleScope: role?.scope || null,
      permissions: role?.permissions || [],
      workspaceId: user.workspaceId?.toString() || null,
      isVerified: user.isVerified,
      isActive: user.isActive,
    };

    next();
  } catch (err) {
    return res.error({
      message: "Authentication failed. Please log in again.",
      statusCode: 401,
      trace: err,
    });
  }
};

/**
 * `authorize(permissions)` — Permission check on top of `protect`.
 *
 * Accepts a string or string[]. Wildcard `*` always passes.
 *
 *   router.get("/articles", protect, authorize("tenant.article:read"), handler);
 *   router.delete("/users/:id", protect, authorize(["platform.user:manage", "*"]), handler);
 */
export const authorize = (requiredPermissions) => (req, res, next) => {
  const userPermissions = req.user?.permissions || [];

  if (userPermissions.includes("*")) return next();

  const required = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  const ok = required.some((p) => userPermissions.includes(p));
  if (!ok) {
    return res.error({
      message: "You don't have permission to access this resource",
      statusCode: 403,
    });
  }

  next();
};

/**
 * `authorizeRoles(roles)` — Role-based check (alternative to permissions).
 *   router.get("/admin", protect, authorizeRoles(["super_admin"]), handler);
 */
export const authorizeRoles = (roles) => (req, res, next) => {
  const role = req.user?.role;
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!role || !allowed.includes(role)) {
    return res.error({
      message: "You don't have permission to access this resource",
      statusCode: 403,
    });
  }

  next();
};
