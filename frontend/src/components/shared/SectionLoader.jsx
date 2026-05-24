import { cn } from "@/lib/utils";

export default function SectionLoader({ rows = 3, className }) {
  return (
    <div className={cn("space-y-3 animate-pulse", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-md bg-muted/40 border border-white/5"
        />
      ))}
    </div>
  );
}
