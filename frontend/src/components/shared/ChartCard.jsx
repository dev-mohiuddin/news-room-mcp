import GlassCard from "@/components/shared/GlassCard";
import { cn } from "@/lib/utils";

export default function ChartCard({
  title,
  subtitle,
  actions,
  height = 300,
  className,
  children,
}) {
  return (
    <GlassCard className={cn("p-5 md:p-6", className)}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-display text-lg leading-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div style={{ height }}>{children}</div>
    </GlassCard>
  );
}

// Common chart palette — re-export for re-use across pages.
export const CHART_PALETTE = {
  blue: "#3B82F6",
  violet: "#8B5CF6",
  teal: "#2DD4BF",
  pink: "#EC4899",
  orange: "#F59E0B",
  emerald: "#10B981",
  red: "#EF4444",
  slate: "#64748B",
};

export const CHART_GRID_COLOR = "rgba(148, 163, 184, 0.12)";
export const CHART_TICK_COLOR = "rgba(148, 163, 184, 0.7)";
