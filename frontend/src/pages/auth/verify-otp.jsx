import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import AuthLayout from "@/components/auth/AuthLayout";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import {
  verifyEmailOtp,
  resendEmailOtp,
} from "@/redux/slice/auth-slice";
import { getRedirectFor } from "@/lib/permissions";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const pendingEmail = useSelector((s) => s.auth.pendingVerificationEmail);
  const stateEmail = location.state?.email;
  const email = useMemo(
    () => stateEmail || pendingEmail || "",
    [stateEmail, pendingEmail]
  );

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const inputsRef = useRef([]);

  /* If no email in state or redux, bounce back to login */
  useEffect(() => {
    if (!email) {
      toast.error("Please register or sign in first.");
      navigate("/auth/register", { replace: true });
    }
  }, [email, navigate]);

  /* Initial focus */
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  /* Resend cooldown ticker */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const setDigitAt = (index, value) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
    if (sanitized && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const filled = text.split("");
    const next = Array(OTP_LENGTH).fill("");
    filled.forEach((d, i) => (next[i] = d));
    setDigits(next);
    const lastIdx = Math.min(filled.length, OTP_LENGTH) - 1;
    inputsRef.current[lastIdx]?.focus();
  };

  const otp = digits.join("");
  const canSubmit = otp.length === OTP_LENGTH && !submitting;

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await dispatch(
        verifyEmailOtp({ email, otp })
      ).unwrap();
      const user = result?.data?.user;
      if (user) {
        toast.success("Email verified! Welcome.");
        navigate(getRedirectFor(user), { replace: true });
      } else {
        toast.error(result?.message || "Verification failed");
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Invalid OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await dispatch(resendEmailOtp({ email })).unwrap();
      toast.success("New OTP sent. Check your inbox.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

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
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-display text-3xl">Verify your email</h2>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to
          </p>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-brand-violet" />
            {email}
          </p>
        </motion.div>

        <motion.form onSubmit={onSubmit} variants={fadeUp} className="space-y-6">
          {/* OTP boxes */}
          <div
            className="grid grid-cols-6 gap-2 sm:gap-3"
            onPaste={handlePaste}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={d}
                onChange={(e) => setDigitAt(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className={cn(
                  "h-14 rounded-xl text-center text-xl font-semibold",
                  "bg-white/5 border border-white/10 backdrop-blur",
                  "focus:outline-none focus:border-brand-violet/60 focus:bg-white/10",
                  "transition-all"
                )}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          <GradientButton
            type="submit"
            className="w-full"
            disabled={!canSubmit}
          >
            {submitting ? (
              "Verifying…"
            ) : (
              <>
                Verify & Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </GradientButton>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Didn't get the code?</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResend}
              disabled={cooldown > 0 || resending}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", resending && "animate-spin")} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
            </Button>
          </div>
        </motion.form>

        <motion.p
          variants={fadeUp}
          className="text-center text-xs text-muted-foreground"
        >
          Wrong email?{" "}
          <button
            type="button"
            onClick={() => navigate("/auth/register", { replace: true })}
            className="text-foreground hover:underline"
          >
            Go back
          </button>
        </motion.p>
      </motion.div>
    </AuthLayout>
  );
}
