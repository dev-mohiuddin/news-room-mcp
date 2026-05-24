import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function FilterBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  children,
  onReset,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-xl glass border border-white/5",
        className
      )}
    >
      <div className="relative flex-1 min-w-0">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10 bg-transparent border-white/10"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>
    </div>
  );
}
