import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "@/redux/slice/auth-slice";
import { hasPermission, hasRole, getRedirectFor } from "@/lib/permissions";

/**
 * Single hook for all auth/RBAC needs.
 *
 *   const { user, isAuthenticated, can, is, logout } = useAuth();
 *
 *   {can("tenant.article:publish") && <PublishButton />}
 *   {is("super_admin") && <AdminLink />}
 */
export default function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, accessToken } = useSelector(
    (s) => s.auth
  );

  const logout = async () => {
    await dispatch(logoutUser());
    navigate("/auth/login", { replace: true });
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    accessToken,
    role: user?.role ?? null,
    permissions: user?.permissions ?? [],

    /** can("tenant.article:publish") or can(["a", "b"]) */
    can: (perms) => hasPermission(user, perms),

    /** is("super_admin") or is(["a", "b"]) */
    is: (roles) => hasRole(user, roles),

    /** redirect URL appropriate for this user */
    getRedirect: () => getRedirectFor(user),

    logout,
  };
}
