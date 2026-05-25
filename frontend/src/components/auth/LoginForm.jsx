import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradientButton from "@/components/shared/GradientButton";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import AuthOrDivider from "@/components/auth/AuthOrDivider";

import { signInUser } from "@/redux/slice/auth-slice";
import { loginSchema } from "@/lib/validators";
import { getRedirectFor } from "@/lib/permissions";
import { fadeUp, staggerContainer } from "@/lib/animations";

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await dispatch(signInUser(data)).unwrap();
      const user = result?.data?.user;

      if (user) {
        toast.success(`Welcome back, ${user.name}!`);
        const fromPath = location.state?.from?.pathname;
        const target = fromPath || getRedirectFor(user);
        navigate(target, { replace: true });
      } else {
        toast.error(result?.message || "Login failed");
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const errors = form.formState.errors;

  return (
    <motion.div
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Google sign-in (top) */}
      <motion.div variants={fadeUp}>
        <GoogleSignInButton disabled={loading} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <AuthOrDivider label="or sign in with email" />
      </motion.div>

      <motion.form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-1.5">
            <Label
              htmlFor="email"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Email
            </Label>
          </div>
          <div className="relative">
            <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-10 bg-transparent border-white/10"
              autoComplete="email"
              {...form.register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive mt-1.5">
              {errors.email.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-1.5">
            <Label
              htmlFor="password"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Password
            </Label>
            <Link
              to="/auth/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10 bg-transparent border-white/10"
              autoComplete="current-password"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPwd ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1.5">
              {errors.password.message}
            </p>
          )}
        </motion.div>

        <motion.div variants={fadeUp}>
          <GradientButton type="submit" className="w-full mt-1" disabled={loading}>
            {loading ? (
              "Signing in…"
            ) : (
              <>
                Sign In <ArrowRight className="h-4 w-4" />
              </>
            )}
          </GradientButton>
        </motion.div>
      </motion.form>
    </motion.div>
  );
}
