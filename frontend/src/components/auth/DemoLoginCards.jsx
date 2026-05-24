import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Shield, Sparkles, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { setUser } from "@/redux/slice/auth-slice";
import { DEMO_ACCOUNTS, persistDemoLogin } from "@/lib/demoAuth";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

const ICONS = { shield: Shield, sparkles: Sparkles };

export default function DemoLoginCards() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(null);

  const handleDemoLogin = (key) => {
    setBusy(key);
    // Tiny artificial delay so the user sees the loading state.
    setTimeout(() => {
      const result = persistDemoLogin(key);
      if (!result) {
        toast.error("Could not load demo profile");
        setBusy(null);
        return;
      }
      dispatch(setUser(result.user));
      toast.success(`Signed in as ${result.user.name}`);
      navigate(result.redirectTo, { replace: true });
    }, 600);
  };

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      <motion.div
        variants={staggerItem}
        className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
      >
        <Zap className="h-3 w-3 text-brand-teal" />
        <span>Try it instantly · demo accounts</span>
        <span className="flex-1 h-px bg-white/10" />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {Object.entries(DEMO_ACCOUNTS).map(([key, profile]) => {
          const Icon = ICONS[profile.iconKey] ?? Sparkles;
          const isBusy = busy === key;
          return (
            <motion.button
              key={key}
              variants={staggerItem}
              type="button"
              disabled={!!busy}
              onClick={() => handleDemoLogin(key)}
              className={cn(
                "group relative overflow-hidden rounded-xl glass border border-white/10 p-3.5 text-left transition-all",
                "hover:border-white/25 hover:scale-[1.015] active:scale-[0.99]",
                isBusy && "ring-2 ring-primary/50"
              )}
            >
              {/* gradient accent stripe */}
              <span
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b opacity-80",
                  profile.accent
                )}
              />

              {/* hover glow */}
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  profile.glow === "violet"
                    ? "shadow-[inset_0_0_60px_rgba(139,92,246,0.18)]"
                    : "shadow-[inset_0_0_60px_rgba(59,130,246,0.18)]"
                )}
              />

              <div className="relative flex items-start gap-3">
                <span
                  className={cn(
                    "h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0",
                    profile.accent
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold leading-tight">
                      {profile.label}
                    </p>
                    <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-white/10 text-foreground/80">
                      {profile.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                    {profile.description}
                  </p>
                </div>

                <ArrowRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-all shrink-0",
                    "group-hover:text-foreground group-hover:translate-x-0.5",
                    isBusy && "animate-pulse text-primary"
                  )}
                />
              </div>

              {isBusy && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
