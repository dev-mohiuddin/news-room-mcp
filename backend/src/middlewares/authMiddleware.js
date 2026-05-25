import { verifyAccessToken } from "#utils/jwtUtil.js";

/**
 * `protect` — Verifies JWT from Authorization header or cookie.
 * Attaches `req.user` with decoded payload + flags.
 *
 * NOTE: This middleware does NOT load the user from the database — that's the
 * caller's responsibility (usually via a userRepository call), so the auth
 * layer stays decoupled from any specific User model. When you wire your User
 * model, swap in a `findUserById` lookup here.
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

    req.user = {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      workspaceId: decoded.workspaceId || null,
      ...decoded,
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
 * Accepts a string or string[]. Wildcard `*` always passes.
 *
 *   router.get("/users", protect, authorize(["platform.user:read"]), handler)
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
 *   router.get("/admin", protect, authorizeRoles(["SuperAdmin"]), handler)
 */
export const authorizeRoles = (roles) => (req, res, next) => {
  const role = req.user?.role || req.user?.roleName;
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!role || !allowed.includes(role)) {
    return res.error({
      message: "You don't have permission to access this resource",
      statusCode: 403,
    });
  }

  next();
};
