import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getRedirectFor,
  hasRole,
  inScope,
  ROLE_SCOPES,
} from "@/lib/permissions";

/**
 * IsLogin — wraps any private route and forces login.
 */
export const IsLogin = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  return children || <Outlet />;
};

/**
 * GuestRoute — keeps already-logged-in users out of /auth/* pages.
 */
export const GuestRoute = ({ children }) => {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);

  if (isAuthenticated && user) {
    return <Navigate to={getRedirectFor(user)} replace />;
  }
  return children || <Outlet />;
};

/**
 * RoleGuard — supports either an array of role names OR a scope check.
 *
 * Pass `allowedRoles` for fine-grained control. The guard is also
 * scope-aware — if any allowed role is in the tenant scope, then
 * any tenant-scoped user is permitted (defense against stale role
 * names from old localStorage tokens). Same for platform.
 */
export const RoleGuard = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.length) {
    return children || <Outlet />;
  }

  // Direct role match
  if (hasRole(user, allowedRoles)) {
    return children || <Outlet />;
  }

  // Scope-based fallback. Avoid redirect loops when localStorage holds
  // a stale role name like "user" but the user is actually a tenant.
  const TENANT_ROLE_NAMES = ["workspace_owner", "editor", "writer", "viewer", "user"];
  const PLATFORM_ROLE_NAMES = ["super_admin"];

  const allowsTenantScope = allowedRoles.some((r) =>
    TENANT_ROLE_NAMES.includes(r)
  );
  const allowsPlatformScope = allowedRoles.some((r) =>
    PLATFORM_ROLE_NAMES.includes(r)
  );

  if (allowsTenantScope && inScope(user, ROLE_SCOPES.TENANT)) {
    return children || <Outlet />;
  }
  if (allowsPlatformScope && inScope(user, ROLE_SCOPES.PLATFORM)) {
    return children || <Outlet />;
  }

  // Send to the user's correct panel home if they hit the wrong area
  return <Navigate to={getRedirectFor(user)} replace />;
};
