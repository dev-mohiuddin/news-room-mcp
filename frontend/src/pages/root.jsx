import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getRedirectFor } from "@/lib/permissions";

// Optional helper page — if mounted at "/", routes user to their panel
// when authenticated, or stays on landing otherwise.
export default function RootPage() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRedirectFor(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return null;
}
