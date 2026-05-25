import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { googleSignIn } from "@/redux/slice/auth-slice";
import { getRedirectFor } from "@/lib/permissions";

/**
 * Google Sign-In button.
 *
 * In production: integrates with Google Identity Services (GIS) when
 * VITE_GOOGLE_CLIENT_ID is set. For now in dev — shows a "Coming soon"
 * toast so users see the option without integration friction.
 *
 * To enable:
 *   1. Get a Google OAuth Client ID from console.cloud.google.com
 *   2. Add to frontend/.env: VITE_GOOGLE_CLIENT_ID=...
 *   3. Add same value to backend/.env: GOOGLE_CLIENT_ID=...
 *   4. Add the Google GIS script to index.html:
 *      <script src="https://accounts.google.com/gsi/client" async defer></script>
 *   5. The button below will activate automatically.
 */
export default function GoogleSignInButton({ disabled = false, label = "Continue with Google" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleClick = async () => {
    if (!clientId || typeof window.google === "undefined") {
      toast.info("Google Sign-In is not configured yet. Use email or demo accounts.");
      return;
    }

    setBusy(true);
    try {
      // Initialize GIS once
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const result = await dispatch(googleSignIn({ idToken: response.credential })).unwrap();
            const user = result?.data?.user;
            if (user) {
              toast.success(`Welcome, ${user.name}!`);
              const target = location.state?.from?.pathname || getRedirectFor(user);
              navigate(target, { replace: true });
            }
          } catch (err) {
            toast.error(err || "Google sign-in failed");
          } finally {
            setBusy(false);
          }
        },
      });

      // Trigger the One Tap or popup
      window.google.accounts.id.prompt();
    } catch (err) {
      toast.error("Could not start Google sign-in");
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <Button
        type="button"
        variant="glass"
        size="lg"
        className="w-full gap-3"
        onClick={handleClick}
        disabled={disabled || busy}
      >
        <GoogleLogo />
        <span>{busy ? "Connecting…" : label}</span>
      </Button>
    </motion.div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.8h5.3c-.2 1.4-1.6 4.1-5.3 4.1-3.2 0-5.8-2.6-5.8-5.9s2.6-5.9 5.8-5.9c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 3.8 14.6 3 12 3 6.9 3 2.8 7.1 2.8 12.2S6.9 21.4 12 21.4c6.9 0 9.5-4.8 9.5-7.3 0-.5 0-.9-.1-1.3l-9.4-.1z"
      />
      <path fill="#34A853" d="M3.5 7.5l3.1 2.3c.8-1.6 2.4-2.7 4.4-2.7" opacity="0" />
      <path fill="#FBBC05" d="M21.5 12.2c0 .5 0 .9-.1 1.3l-9.4-.1V10.2h5.3c-.1.7-.3 1.3-.6 1.9" opacity="0" />
    </svg>
  );
}
