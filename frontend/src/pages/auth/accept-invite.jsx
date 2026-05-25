import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, Lock, User, ArrowRight, ShieldX } from "lucide-react";
import { toast } from "sonner";

import AuthLayout from "@/components/auth/AuthLayout";
import GradientButton from "@/components/shared/GradientButton";
import GlassCard from "@/components/shared/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inspectInvite,
  acceptInvite,
} from "@/redux/slice/team-slice";
import { signInUser } from "@/redux/slice/auth-slice";
import { getRedirectFor } from "@/lib/permissions";
import { fadeUp, staggerContainer } from "@/lib/animations";

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const inviteInspection = useSelector((s) => s.team.inviteInspection);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) dispatch(inspectInvite(token));
  }, [dispatch, token]);

  const valid = inviteInspection?.valid;

  const onAccept = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!name || name.length < 2) {
      toast.error("Name is required");
      return;
    }

    setBusy(true);
    try {
      await dispatch(
        acceptInvite({ token, payload: { name, password } })
      ).unwrap();
      toast.success("Invitation accepted! Signing you in…");

      // Auto-login with the just-set credentials
      try {
        const loginRes = await dispatch(
          signInUser({ email: inviteInspection.email, password })
        ).unwrap();
        const loggedInUser = loginRes?.data?.user;
        if (loggedInUser) {
          navigate(getRedirectFor(loggedInUser), { replace: true });
          return;
        }
      } catch {
        // Fallback to manual login if auto-login fails
      }
      navigate("/auth/login", { replace: true });
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Could not accept invitation");
    } finally {
      setBusy(false);
    }
  };

  if (inviteInspection === null) {
    return (
      <AuthLayout>
        <p className="text-center text-sm text-muted-foreground">
          Loading invitation…
        </p>
      </AuthLayout>
    );
  }

  if (!valid) {
    return (
      <AuthLayout>
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full glass border border-white/10 flex items-center justify-center">
            <ShieldX className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="font-display text-2xl">Invitation invalid</h2>
          <p className="text-sm text-muted-foreground">
            {inviteInspection?.status === "expired"
              ? "This invitation has expired. Ask the workspace owner to send a new one."
              : inviteInspection?.status === "accepted"
                ? "This invitation has already been accepted."
                : inviteInspection?.status === "cancelled"
                  ? "This invitation was cancelled."
                  : "This invitation is invalid or has been used."}
          </p>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={fadeUp} className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl gradient-bg shadow-[0_8px_24px_rgba(139,92,246,0.30)]">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-display text-3xl">Join the workspace</h2>
          <p className="text-sm text-muted-foreground">
            You've been invited to join{" "}
            <span className="font-medium text-foreground">
              {inviteInspection.workspaceName}
            </span>{" "}
            as a{" "}
            <span className="font-medium text-foreground capitalize">
              {inviteInspection.roleDisplayName || inviteInspection.roleName}
            </span>
            .
          </p>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GlassCard className="p-3 flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-brand-violet" />
            <span className="text-muted-foreground">Invitation for</span>
            <span className="font-medium">{inviteInspection.email}</span>
          </GlassCard>
        </motion.div>

        <motion.form variants={fadeUp} onSubmit={onAccept} className="space-y-4">
          <div>
            <Label
              htmlFor="name"
              className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 inline-block"
            >
              Full name
            </Label>
            <div className="relative">
              <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="pl-10 bg-transparent border-white/10"
                autoComplete="name"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="password"
              className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 inline-block"
            >
              Choose a password
            </Label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (min 8 chars)"
                className="pl-10 bg-transparent border-white/10"
                autoComplete="new-password"
              />
            </div>
          </div>

          <GradientButton type="submit" className="w-full" disabled={busy}>
            {busy ? (
              "Joining…"
            ) : (
              <>
                Accept & continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </GradientButton>
        </motion.form>
      </motion.div>
    </AuthLayout>
  );
}
