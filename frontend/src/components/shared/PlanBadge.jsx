import { Badge } from "@/components/ui/badge";

const COLORS = {
  free: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  starter: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  pro: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  agency: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function PlanBadge({ plan = "free" }) {
  const cls = COLORS[plan?.toLowerCase()] ?? COLORS.free;
  return (
    <Badge variant="outline" className={cls + " border capitalize"}>
      {plan}
    </Badge>
  );
}
