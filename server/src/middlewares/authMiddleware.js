import { verifyToken } from "#utils/jwtUtil.js";
import { findUserById } from "#repositories/userRepository.js";

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }
    if (!token) return res.error({ message: "Not logged in", statusCode: 401 });

    const decoded = verifyToken(token);
    const user = await findUserById(decoded.id, { populateRole: true });

    if (!user) return res.error({ message: "User not found", statusCode: 401 });

    if (user.isDeleted) return res.error({ message: "Account has been deactivated", statusCode: 403 });

    const roleName = String(user.roleId?.name || "").toLowerCase();
    const isElevated = roleName.includes("admin") || roleName.includes("super");

    if (!user.isActive && !isElevated) {
      return res.error({ message: "Account is inactive. Contact support for assistance.", statusCode: 403 });
    }

    req.user = {
      ...user.toObject(),
      roleId: user.roleId?._id,
      permissions: user.roleId?.permissions || [],
      hierarchy: user.roleId?.hierarchy || 0,
      roleName: user.roleId?.name || null,
    };

    next();
  } catch (err) {
    res.error({ message: "Authentication failed", statusCode: 401 });
  }
};

export const authorize = (requiredPermissions) => (req, res, next) => {
  try {
    const userPermissions = req.user?.permissions || [];

    if (userPermissions.includes("*")) return next();

    const perms = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    const hasPermission = perms.some((p) => userPermissions.includes(p));
    if (!hasPermission)
      return res.error({ message: "Forbidden", statusCode: 403 });

    next();
  } catch (err) {
    res.error({ message: "Authorization failed", statusCode: 500 });
  }
};
