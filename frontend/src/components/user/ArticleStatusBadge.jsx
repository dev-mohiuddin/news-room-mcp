import { useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Article status pill that auto-upgrades to a live progress display
 * when the BullMQ job emits `article:progress` events.
 *
 * Falls back to the persisted `article.status` when no live
 * progress entry exists in the redux store.
 */

const STATUS_LABELS = {
  draft: "Draft",
  researching: "Researching",
  outlining: "Outlining",
  drafting: "Drafting",
  seo_optimizing: "SEO",
  originality_checking: "Originality",
  draft_ready: "Ready",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  needs_revision: "Needs revision",
};

const STATUS_TONE = {
  draft: "bg-white/10 text-foreground border-white/15",
  researching: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  outlining: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  drafting: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  seo_optimizing: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  originality_checking: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  draft_ready: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  scheduled: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  publishing: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  published: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  failed: "bg-red-500/15 text-red-300 border-red-400/30",
  needs_revision: "bg-amber-500/15 text-amber-300 border-amber-400/30",
};

const ACTIVE = new Set([
  "researching",
  "outlining",
  "drafting",
  "seo_optimizing",
  "originality_checking",
  "publishing",
]);

export default function ArticleStatusBadge({ articleId, status, className }) {
  const live = useSelector(
    (s) => (articleId ? s.articles?.progress?.[articleId] : null) || null
  );
  const effective = live?.status || status || "draft";
  const tone = STATUS_TONE[effective] || STATUS_TONE.draft;
  const label = STATUS_LABELS[effective] || effective;
  const showSpinner = ACTIVE.has(effective);

  const percent = live?.percent;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] uppercase tracking-widest px-2 py-0.5 border",
        tone,
        className
      )}
    >
      {showSpinner && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse mr-1" />
      )}
      {label}
      {showSpinner && typeof percent === "number" && (
        <span className="ml-1 tabular-nums opacity-80">{percent}%</span>
      )}
    </Badge>
  );
}
