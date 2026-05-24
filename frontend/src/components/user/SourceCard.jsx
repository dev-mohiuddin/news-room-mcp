import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export default function SourceCard({ source, selected = false, onToggle }) {
  const tone =
    source.score >= 90
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : source.score >= 80
      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
      : "bg-amber-500/15 text-amber-400 border-amber-500/30";

  return (
    <motion.label
      whileHover={{ y: -2 }}
      className={cn(
        "block cursor-pointer p-4 rounded-xl glass border transition-all",
        selected
          ? "border-primary/40 ring-2 ring-primary/30"
          : "border-white/10 hover:border-white/20"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle?.(source.id)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">
                {source.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                {source.domain}
                <span>·</span>
                <span>{source.date}</span>
                <span>·</span>
                <span>{source.reading}</span>
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full border",
                tone
              )}
            >
              {source.score}
            </span>
          </div>

          <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {source.summary}
          </p>

          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            Open source <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.label>
  );
}
