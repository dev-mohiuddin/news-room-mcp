import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

import AuthLayout from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradientButton from "@/components/shared/GradientButton";
import { forgotPasswordApi } from "@/api/auth/auth";
import { forgotPasswordSchema } from "@/lib/validators";
import { fadeUp } from "@/lib/animations";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const res = await forgotPasswordApi(data);
    setLoading(false);
    if (res?.success) {
      setSent(true);
    } else {
      toast.error(res?.message || "Failed to send reset email");
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div
            key="form"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 className="font-display text-3xl">Forgot password?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email and we'll send a reset link.
            </p>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 pt-6"
            >
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 inline-block">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    className="pl-10"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1.5">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <GradientButton type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </GradientButton>
            </form>

            <Link
              to="/auth/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <div className="mx-auto h-14 w-14 rounded-full gradient-bg flex items-center justify-center">
              <MailCheck className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-display text-2xl mt-5">Check your inbox</h2>
            <p className="text-sm text-muted-foreground mt-2">
              We sent a password reset link to your email. The link expires in
              30 minutes.
            </p>

            <Link
              to="/auth/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
