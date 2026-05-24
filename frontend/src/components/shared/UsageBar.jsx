import { cn } from "@/lib/utils";

/**
 * Reusable usage progress bar with auto color thresholds.
 * - <70% — gradient
 * - 70-89% — amber
 * - >=90% — red
 */
export default function UsageBar({
  label,
  value = 0,
  max = 100,
  unit = "",
  showPercent = false,
  className,
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const tone =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "gradient-bg";

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="flex items-baseline justify-between mb-1.5">
          {label && <p className="text-sm">{label}</p>}
          <p className="text-xs text-muted-foreground tabular-nums">
            {showPercent ? `${pct}%` : `${value}${unit ? " " + unit : ""} / ${max}${unit ? " " + unit : ""}`}
          </p>
        </div>
      )}
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
