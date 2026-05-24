import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROLES } from "@/lib/constants";

// Optional helper page — if mounted at "/", routes user to their panel
// when authenticated, or stays on landing otherwise.
export default function RootPage() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);

  useEffect(() => {
    if (isAuthenticated && user) {
      const target =
        user.role === ROLES.SUPER_ADMIN ? "/admin/dashboard" : "/dashboard";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return null;
}
