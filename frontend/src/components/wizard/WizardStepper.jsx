import { Check, Loader2, AlertCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ============================================================
 *  WizardStepper — Requirement 1 (Five-stage shell)
 * ============================================================
 *
 *  Visual states per step:
 *    - approved        → check indicator (green)
 *    - awaiting_approval → bullet (amber, ready for user action)
 *    - running         → spinner (blue)
 *    - failed          → alert icon (red)
 *    - pending         → numeric badge (muted) — disabled when any other
 *                        stage is running
 *
 *  Click handler is suppressed:
 *    - when a stage is currently running
 *    - when the target step is `pending` and is not the current step
 */

const STAGES = [
  { name: "research", label: "Research" },
  { name: "outline", label: "Outline" },
  { name: "draft", label: "Draft" },
  { name: "originality", label: "Originality" },
  { name: "seo", label: "SEO" },
  { name: "publish", label: "Publish" },
];

const stateStyle = (status) => {
  switch (status) {
    case "approved":
      return "border-emerald-400/50 text-emerald-300 bg-emerald-500/10";
    case "awaiting_approval":
      return "border-amber-400/40 text-amber-300 bg-amber-500/10";
    case "running":
      return "border-sky-400/40 text-sky-300 bg-sky-500/10";
    case "failed":
      return "border-red-400/40 text-red-300 bg-red-500/10";
    default:
      return "border-white/10 text-muted-foreground bg-transparent";
  }
};

export default function WizardStepper({
  stages,
  currentStep,
  onSelect,
  isAnyRunning,
  articleId = null,
}) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STAGES.map(({ name, label }, idx) => {
        const stage = stages[name] || { status: "pending" };
        const status = stage.status;
        const isActive = currentStep === name;

        // Before the user has submitted the initial form (articleId is
        // null), only the active step is clickable. This prevents the
        // user from "navigating" to an empty Outline / Draft step that
        // has no data to render.
        const navigable =
          status === "approved" ||
          status === "awaiting_approval" ||
          status === "failed";

        const isClickable =
          !isAnyRunning &&
          (Boolean(articleId)
            ? navigable || (status === "pending" && isActive)
            : isActive);

        const Icon =
          status === "approved" ? Check :
          status === "running" ? Loader2 :
          status === "failed" ? AlertCircle :
          status === "pending" && !isActive ? Lock :
          null;

        return (
          <li key={name} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onSelect?.(name)}
              className={cn(
                "h-9 sm:h-10 px-3 rounded-lg border flex items-center gap-2 transition-colors",
                stateStyle(status),
                isActive && "ring-1 ring-primary/40",
                !isClickable && "cursor-not-allowed opacity-80"
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    status === "running" && "animate-spin"
                  )}
                />
              ) : (
                <span className="text-[10px] font-bold tabular-nums">
                  {idx + 1}
                </span>
              )}
              <span className="text-xs font-medium">{label}</span>
            </button>
            {idx < STAGES.length - 1 && (
              <span
                className={cn(
                  "h-px w-4 sm:w-6",
                  status === "approved" ? "bg-emerald-400/40" : "bg-white/10"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
