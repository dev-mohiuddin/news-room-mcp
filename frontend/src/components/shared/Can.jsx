import { useSelector } from "react-redux";
import {
  hasPermission,
  hasAllPermissions,
  hasRole,
} from "@/lib/permissions";

/**
 * Declarative permission gate.
 *
 *   <Can perm="tenant.article:publish">
 *     <PublishButton />
 *   </Can>
 *
 *   <Can perm={["a", "b"]} mode="all">All required</Can>
 *
 *   <Can role="super_admin">Admin-only chunk</Can>
 *
 *   <Can perm="tenant.team:manage" fallback={<UpgradePrompt />}>
 *     <InviteForm />
 *   </Can>
 *
 * Props
 *   perm     string | string[]         permission(s) required
 *   role     string | string[]         role(s) accepted
 *   mode     "any" | "all"             default "any" — used with perm[]
 *   fallback ReactNode                 rendered when access denied
 *   children ReactNode | (user)=>node  rendered when access granted
 */
export default function Can({
  perm,
  role,
  mode = "any",
  fallback = null,
  children,
}) {
  const user = useSelector((s) => s.auth.user);

  let allowed = true;
  if (perm) {
    allowed = mode === "all"
      ? hasAllPermissions(user, perm)
      : hasPermission(user, perm);
  }
  if (allowed && role) {
    allowed = hasRole(user, role);
  }

  if (!allowed) return fallback;
  return typeof children === "function" ? children(user) : children;
}
