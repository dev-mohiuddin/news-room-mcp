import { cn } from "@/lib/utils";

/**
 * Reusable skeleton — gentle pulse, glass-toned.
 * Use composition: <Skeleton className="h-10 w-full" />
 */
export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04]",
        "bg-[length:200%_100%] animate-skeleton",
        className
      )}
      {...props}
    />
  );
}

/* Common preset rows for tables / cards */
export function SkeletonRow({ count = 3, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

export function SkeletonKpi() {
  return (
    <div className="rounded-2xl glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl glass p-5 space-y-3">
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>
    </div>
  );
}
