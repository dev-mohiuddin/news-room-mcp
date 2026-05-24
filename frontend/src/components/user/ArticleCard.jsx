import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Eye, Clock, MoreHorizontal } from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { dateFormater, formatNumber } from "@/lib/utils";

export default function ArticleCard({ article, onAction }) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25 }}>
      <GlassCard className="p-5 h-full flex flex-col gap-4 group" hover>
        {/* fake thumbnail block with gradient */}
        <div className="relative h-28 rounded-lg overflow-hidden gradient-bg shrink-0">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="absolute top-2 left-2 flex gap-1">
            <StatusBadge status={article.status} />
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/40 text-white backdrop-blur-md">
            {article.cms}
          </div>
          <FileText className="absolute right-3 top-3 h-5 w-5 text-white/40" />
        </div>

        <div className="flex-1 min-w-0">
          <Link
            to={`/dashboard/articles/${article.id}`}
            className="block font-medium leading-snug line-clamp-2 hover:text-primary transition-colors"
          >
            {article.title}
          </Link>

          {article.tags?.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {article.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {article.words}w
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readingTime}m
            </span>
            {article.status === "published" && (
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatNumber(article.views)}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction?.("edit", article)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.("duplicate", article)}>
                Duplicate
              </DropdownMenuItem>
              {article.status === "published" && (
                <DropdownMenuItem onClick={() => onAction?.("view-cms", article)}>
                  View on CMS
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onAction?.("delete", article)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-[10px] text-muted-foreground/70 -mt-2">
          Updated {dateFormater(article.updatedAt, "MMM d, HH:mm")}
        </p>
      </GlassCard>
    </motion.div>
  );
}
