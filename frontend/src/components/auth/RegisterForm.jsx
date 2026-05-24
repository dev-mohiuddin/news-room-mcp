import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradientButton from "@/components/shared/GradientButton";
import { signUpUser } from "@/redux/slice/auth-slice";
import { registerSchema } from "@/lib/validators";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

const PWD_LEVELS = [
  { label: "Weak", color: "bg-red-500" },
  { label: "Fair", color: "bg-orange-500" },
  { label: "Good", color: "bg-yellow-500" },
  { label: "Strong", color: "bg-emerald-500" },
];

function pwdScore(p = "") {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return Math.min(score, 4);
}

export default function RegisterForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const password = form.watch("password");
  const score = pwdScore(password);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await dispatch(signUpUser(data)).unwrap();
      if (res?.status === "success") {
        toast.success("Account created. Welcome!");
        if (res.data?.token) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/auth/login", { replace: true });
        }
      } else {
        toast.error(res?.message || "Registration failed");
      }
    } catch (err) {
      toast.error(err?.message || err || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const errors = form.formState.errors;

  return (
    <motion.form
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="visible"
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <Field
        id="name"
        label="Full name"
        icon={User}
        error={errors.name?.message}
      >
        <Input
          id="name"
          placeholder="Jane Doe"
          className="pl-10 bg-transparent border-white/10"
          {...form.register("name")}
        />
      </Field>

      <Field id="email" label="Email" icon={Mail} error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          className="pl-10 bg-transparent border-white/10"
          {...form.register("email")}
        />
      </Field>

      <Field
        id="password"
        label="Password"
        icon={Lock}
        error={errors.password?.message}
      >
        <Input
          id="password"
          type={showPwd ? "text" : "password"}
          placeholder="••••••••"
          className="pl-10 pr-10 bg-transparent border-white/10"
          {...form.register("password")}
        />
        <button
          type="button"
          onClick={() => setShowPwd((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPwd ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </Field>

      {password && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="-mt-1"
        >
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-colors",
                  i < score ? PWD_LEVELS[score - 1]?.color : "bg-white/10"
                )}
              />
            ))}
          </div>
          {score > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Strength: {PWD_LEVELS[score - 1].label}
            </p>
          )}
        </motion.div>
      )}

      <Field
        id="confirmPassword"
        label="Confirm password"
        icon={ShieldCheck}
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type={showPwd ? "text" : "password"}
          placeholder="••••••••"
          className="pl-10 bg-transparent border-white/10"
          {...form.register("confirmPassword")}
        />
      </Field>

      <motion.label
        variants={fadeUp}
        className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer"
      >
        <input type="checkbox" className="mt-0.5" {...form.register("terms")} />
        <span>
          I agree to the{" "}
          <a href="#" className="text-foreground hover:underline">
            Terms
          </a>{" "}
          &{" "}
          <a href="#" className="text-foreground hover:underline">
            Privacy Policy
          </a>
        </span>
      </motion.label>
      {errors.terms && (
        <p className="text-xs text-destructive">{errors.terms.message}</p>
      )}

      <motion.div variants={fadeUp}>
        <GradientButton type="submit" className="w-full" disabled={loading}>
          {loading ? (
            "Creating account…"
          ) : (
            <>
              Create Account <ArrowRight className="h-4 w-4" />
            </>
          )}
        </GradientButton>
      </motion.div>
    </motion.form>
  );
}

function Field({ id, label, icon: Icon, error, children }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      <Label
        htmlFor={id}
        className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 inline-block"
      >
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
        {children}
      </div>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </motion.div>
  );
}
