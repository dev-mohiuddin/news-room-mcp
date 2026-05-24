import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Compass, FileText, BarChart3, LifeBuoy } from "lucide-react";
import { useSelector } from "react-redux";

import BackgroundOrbs from "@/components/shared/BackgroundOrbs";
import GradientButton from "@/components/shared/GradientButton";
import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/constants";

export default function NotFound() {
  const location = useLocation();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);

  const homeUrl = isAuthenticated && user
    ? user.role === ROLES.SUPER_ADMIN
      ? "/admin/dashboard"
      : "/dashboard"
    : "/";

  // Suggested links based on auth state
  const suggestions = isAuthenticated
    ? user?.role === ROLES.SUPER_ADMIN
      ? [
          { icon: BarChart3, label: "Dashboard", to: "/admin/dashboard" },
          { icon: FileText, label: "Users", to: "/admin/users" },
          { icon: Compass, label: "Settings", to: "/admin/settings" },
          { icon: LifeBuoy, label: "Support", to: "/admin/support" },
        ]
      : [
          { icon: FileText, label: "New article", to: "/dashboard/new-article" },
          { icon: BarChart3, label: "Analytics", to: "/dashboard/analytics" },
          { icon: Compass, label: "Research", to: "/dashboard/research" },
          { icon: LifeBuoy, label: "Support", to: "/dashboard/support" },
        ]
    : [
        { icon: Compass, label: "Features", to: "/#features" },
        { icon: FileText, label: "Pricing", to: "/#pricing" },
        { icon: BarChart3, label: "Sign in", to: "/auth/login" },
        { icon: LifeBuoy, label: "Get started", to: "/auth/register" },
      ];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-16">
      <BackgroundOrbs />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-2xl w-full text-center"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="font-display text-7xl md:text-9xl mt-3 gradient-text leading-none">
          404
        </h1>
        <p className="mt-4 font-display text-2xl">Page not found</p>
        <p className="mt-3 text-muted-foreground">
          The page{" "}
          <code className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono">
            {location.pathname}
          </code>{" "}
          doesn't exist or has been moved.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link to={homeUrl}>
            <GradientButton size="md">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </GradientButton>
          </Link>
          <Button
            variant="glass"
            size="default"
            onClick={() => window.history.back()}
          >
            Go back
          </Button>
        </div>

        {/* Suggested links */}
        <div className="mt-14">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
            You might be looking for
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, staggerChildren: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {suggestions.map((s) => (
              <Link key={s.to} to={s.to}>
                <GlassCard
                  hover
                  className="p-4 text-center cursor-pointer h-full"
                >
                  <span className="inline-flex h-9 w-9 rounded-lg gradient-bg items-center justify-center mb-2">
                    <s.icon className="h-4 w-4 text-white" />
                  </span>
                  <p className="text-xs font-medium">{s.label}</p>
                </GlassCard>
              </Link>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
