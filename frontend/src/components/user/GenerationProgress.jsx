import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  Search,
  ListTree,
  PenLine,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { Badge } from "@/components/ui/badge";

/**
 * Real-time stage tracker driven by socket `article:progress` events
 * (mirrored into redux by ArticleSocketProvider).
 *
 * Renders a vertical 5-step list with live state per step.
 */

const STAGES = [
  { id: "research", label: "Research", icon: Search, percent: 20 },
  { id: "outline", label: "Outline", icon: ListTree, percent: 35 },
  { id: "draft", label: "Draft", icon: PenLine, percent: 65 },
  { id: "seo", label: "SEO", icon: TrendingUp, percent: 80 },
  { id: "originality", label: "Originality", icon: ShieldCheck, percent: 95 },
];

const STATUS_TO_STAGE = {
  draft: null, // not started
  researching: "research",
  outlining: "outline",
  drafting: "draft",
  seo_optimizing: "seo",
  originality_checking: "originality",
};

const stageStatus = (stage, currentStage, isFailed, isDone) => {
  if (isDone) return "complete";
  if (isFailed) {
    if (currentStage === stage) return "failed";
    const idx = STAGES.findIndex((s) => s.id === stage);
    const curIdx = STAGES.findIndex((s) => s.id === currentStage);
    return idx < curIdx ? "complete" : "pending";
  }
  if (!currentStage) return "pending";
  const idx = STAGES.findIndex((s) => s.id === stage);
  const curIdx = STAGES.findIndex((s) => s.id === currentStage);
  if (idx < curIdx) return "complete";
  if (idx === curIdx) return "active";
  return "pending";
};

export default function GenerationProgress({ articleId, status, failureReason }) {
  const live = useSelector((s) =>
    articleId ? s.articles?.progress?.[articleId] : null
  );

  const effectiveStatus = live?.status || status;
  const isFailed = effectiveStatus === "failed";
  const isNeedsRevision = effectiveStatus === "needs_revision";
  const isDone =
    effectiveStatus === "draft_ready" || effectiveStatus === "published";

  const currentStage = live?.stage || STATUS_TO_STAGE[effectiveStatus] || null;
  const percent = live?.percent ?? (isDone ? 100 : 0);

  return (
    <GlassCard
      className={`p-5 ${
        isFailed
          ? "border border-red-500/30"
          : isDone
            ? "border border-emerald-500/30"
            : "border border-primary/20"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : isFailed || isNeedsRevision ? (
          <AlertTriangle className="h-5 w-5 text-red-400" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {isDone
              ? "Draft ready!"
              : isFailed
                ? "Generation failed"
                : isNeedsRevision
                  ? "Needs revision"
                  : "Generating your article…"}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isFailed
                  ? "bg-red-500"
                  : isDone
                    ? "bg-emerald-500"
                    : "gradient-bg"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {percent}%
        </span>
      </div>

      <ul className="space-y-2">
        {STAGES.map((s) => {
          const Icon = s.icon;
          const stat = stageStatus(s.id, currentStage, isFailed || isNeedsRevision, isDone);
          return (
            <motion.li
              key={s.id}
              layout
              className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                stat === "active"
                  ? "border-primary/40 bg-primary/5"
                  : stat === "complete"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : stat === "failed"
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-white/5"
              }`}
            >
              <span
                className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
                  stat === "complete"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : stat === "active"
                      ? "gradient-bg text-white animate-pulse-dot"
                      : stat === "failed"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-white/5 text-muted-foreground"
                }`}
              >
                {stat === "complete" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="flex-1 text-sm">{s.label}</span>
              <Badge
                variant="outline"
                className={`text-[9px] tracking-widest uppercase ${
                  stat === "complete"
                    ? "border-emerald-500/30 text-emerald-300"
                    : stat === "active"
                      ? "border-primary/40 text-primary"
                      : stat === "failed"
                        ? "border-red-500/40 text-red-300"
                        : "border-white/10 text-muted-foreground"
                }`}
              >
                {stat}
              </Badge>
            </motion.li>
          );
        })}
      </ul>

      {(isFailed || isNeedsRevision) && failureReason && (
        <p className="mt-4 text-xs text-muted-foreground">
          Reason:{" "}
          <code className="text-foreground bg-white/5 px-1.5 py-0.5 rounded">
            {failureReason}
          </code>
        </p>
      )}
    </GlassCard>
  );
}
