import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import AuthLayout from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradientButton from "@/components/shared/GradientButton";
import { resetPasswordApi } from "@/api/auth/auth";
import { resetPasswordSchema } from "@/lib/validators";
import { fadeUp } from "@/lib/animations";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(3);

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!done) return;
    const t = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(t);
          navigate("/auth/login", { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done, navigate]);

  const onSubmit = async (data) => {
    setLoading(true);
    const res = await resetPasswordApi(token, { password: data.password });
    setLoading(false);
    if (res?.status === "success") {
      setDone(true);
    } else {
      toast.error(res?.message || "Could not reset password");
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            key="form"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 className="font-display text-3xl">Set a new password</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a strong one you'll remember.
            </p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-6">
              <PwdField
                id="password"
                label="New password"
                error={form.formState.errors.password?.message}
                {...form.register("password")}
              />
              <PwdField
                id="confirmPassword"
                label="Confirm password"
                error={form.formState.errors.confirmPassword?.message}
                {...form.register("confirmPassword")}
              />
              <GradientButton type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </GradientButton>
            </form>

            <Link
              to="/auth/login"
              className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <div className="mx-auto h-14 w-14 rounded-full gradient-bg flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-display text-2xl mt-5">Password updated</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to sign in in {count}s…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}

function PwdField({ id, label, error, ...props }) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 inline-block"
      >
        {label}
      </Label>
      <div className="relative">
        <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} type="password" placeholder="••••••••" className="pl-10" {...props} />
      </div>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}
