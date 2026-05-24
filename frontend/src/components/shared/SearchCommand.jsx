import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ArrowRight,
  CornerDownLeft,
  Command,
} from "lucide-react";
import * as Icons from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SUPER_ADMIN_NAV, USER_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function SearchCommand({ variant = "user" }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  // Flatten the nav into a single list of jumpable items.
  const items = useMemo(() => {
    const source = variant === "admin" ? SUPER_ADMIN_NAV : USER_NAV;
    return source.flatMap((g) =>
      g.items.map((it) => ({
        ...it,
        group: g.group,
      }))
    );
  }, [variant]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.group.toLowerCase().includes(q) ||
        it.path.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Cmd/Ctrl+K opens the palette globally.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset state when re-opening.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  // Keep active index in range when filter changes.
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIdx];
      if (target) jumpTo(target);
    }
  };

  const jumpTo = (item) => {
    navigate(item.path);
    setOpen(false);
  };

  const grouped = useMemo(() => {
    const m = new Map();
    filtered.forEach((it) => {
      if (!m.has(it.group)) m.set(it.group, []);
      m.get(it.group).push(it);
    });
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 px-3 rounded-full glass border border-white/10 text-muted-foreground hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Search</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="md:hidden rounded-full"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border border-white/10 max-w-xl p-0 overflow-hidden">
          {/* a11y but visually de-emphasized */}
          <DialogHeader className="sr-only">
            <DialogTitle>Quick search</DialogTitle>
            <DialogDescription>
              Jump to any page in the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search pages…"
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm h-8 px-0"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          </div>

          <ScrollArea className="max-h-[420px]">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No matches for{" "}
                <span className="text-foreground font-mono">"{query}"</span>
              </div>
            ) : (
              <div className="p-2">
                {grouped.map(([group, list]) => (
                  <div key={group} className="mb-2 last:mb-0">
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      {group}
                    </p>
                    <ul>
                      {list.map((it) => {
                        const idx = filtered.indexOf(it);
                        const Icon = Icons[it.icon] ?? Icons.Circle;
                        const active = idx === activeIdx;
                        return (
                          <li key={it.path}>
                            <button
                              type="button"
                              onMouseEnter={() => setActiveIdx(idx)}
                              onClick={() => jumpTo(it)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                                active
                                  ? "bg-white/[0.06] text-foreground"
                                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                              )}
                            >
                              <span className="h-7 w-7 rounded-md glass border border-white/10 flex items-center justify-center shrink-0">
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="flex-1 truncate">
                                {it.label}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground/60 truncate">
                                {it.path}
                              </span>
                              {active && (
                                <CornerDownLeft className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-white/10 px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-white/5 border border-white/10 font-mono">
                  ↑↓
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-white/5 border border-white/10 font-mono">
                  ↵
                </kbd>
                open
              </span>
            </span>
            <span className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              {filtered.length} results
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
