import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROLES } from "@/lib/constants";

/**
 * IsLogin — wraps any private route and forces login.
 * Pattern reused from amanaah_owner_frontend/src/pages/auth/check-auth.jsx.
 */
export const IsLogin = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  return children || <Outlet />;
};

/**
 * GuestRoute — keeps already-logged-in users out of /auth/* pages.
 * Used in App.jsx for login/register/forgot/reset routes.
 */
export const GuestRoute = ({ children }) => {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);

  if (isAuthenticated && user) {
    const target =
      user.role === ROLES.SUPER_ADMIN ? "/admin/dashboard" : "/dashboard";
    return <Navigate to={target} replace />;
  }
  return children || <Outlet />;
};

/**
 * RoleGuard — supports an array of allowed roles.
 * Usage: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}><AdminLayout /></RoleGuard>
 */
export const RoleGuard = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length && !allowedRoles.includes(user?.role)) {
    // Send to the user's correct panel home if they hit the wrong area
    const fallback =
      user.role === ROLES.SUPER_ADMIN ? "/admin/dashboard" : "/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children || <Outlet />;
};
