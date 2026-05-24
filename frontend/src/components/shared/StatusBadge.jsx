import { Badge } from "@/components/ui/badge";

const COLORS = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function StatusBadge({ status = "draft" }) {
  const cls = COLORS[status] ?? COLORS.draft;
  return (
    <Badge variant="outline" className={cls + " border"}>
      {status}
    </Badge>
  );
}
