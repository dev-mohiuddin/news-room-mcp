import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import AnimatedCounter from "@/components/shared/AnimatedCounter";
import { cn } from "@/lib/utils";

export default function KPICard({
  icon: Icon,
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  trend, // number — positive = up, negative = down, 0 = flat
  trendLabel = "vs last month",
  glow = "violet",
  className,
}) {
  const isUp = trend > 0;
  const isFlat = trend === 0;
  const isDown = trend < 0;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <GlassCard
        glow={glow}
        accent
        className={cn(
          "p-5 md:p-6 h-full card-hover",
          className
        )}
      >
        <div className="flex items-start justify-between gap-2">
          {Icon && (
            <span className="relative h-10 w-10 rounded-xl gradient-bg flex items-center justify-center shadow-[0_4px_18px_rgba(59,130,246,0.35)]">
              {/* tiny inner highlight */}
              <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <Icon className="relative h-4 w-4 text-white" />
            </span>
          )}

          {trend !== undefined && trend !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border tabular-nums",
                isUp &&
                  "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
                isFlat &&
                  "text-muted-foreground bg-white/5 border-white/10",
                isDown && "text-red-400 bg-red-500/10 border-red-500/30"
              )}
            >
              {isUp && <ArrowUpRight className="h-3 w-3" />}
              {isFlat && <Minus className="h-3 w-3" />}
              {isDown && <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>

        <div className="mt-5 font-display text-3xl gradient-text leading-none">
          <AnimatedCounter
            value={value}
            decimals={decimals}
            prefix={prefix}
            suffix={suffix}
          />
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          {trend !== undefined && trend !== null && (
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {trendLabel}
            </p>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
