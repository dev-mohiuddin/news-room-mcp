import { useState } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dateFormater } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ICON_TONE = {
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
};

const DEMO_NOTIFICATIONS = [
  {
    id: "n1",
    type: "warning",
    title: "3 failed payments need attention",
    body: "Customers may lose access soon. Retry charging or contact them.",
    href: "/admin/billing",
    at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "n2",
    type: "info",
    title: "New tenant signed up",
    body: "ContentForge upgraded to Agency plan.",
    href: "/admin/users",
    at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "n3",
    type: "success",
    title: "Broadcast delivered",
    body: "“New CMS integration: Sanity” — 4,453 recipients.",
    href: "/admin/notifications",
    at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: "n4",
    type: "info",
    title: "Settings updated",
    body: "SMTP configuration changed by admin@newsroommcp.com.",
    href: "/admin/logs",
    at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

export default function NotificationBell({ variant = "user" }) {
  const [items, setItems] = useState(DEMO_NOTIFICATIONS);
  const unread = items.filter((i) => !i.read).length;

  const markAllRead = () =>
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));

  const markRead = (id) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, read: true } : it))
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-brand-pink text-[10px] font-bold text-white flex items-center justify-center border-2 border-background"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-pink animate-pulse-dot" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[360px] p-0 overflow-hidden border-white/10"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {unread > 0 ? `${unread} new` : "All caught up"}
            </p>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs text-muted-foreground"
            >
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[360px]">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map((it) => (
                <li
                  key={it.id}
                  onClick={() => markRead(it.id)}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.03]",
                    !it.read && "bg-primary/[0.04]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "h-2 w-2 mt-2 rounded-full shrink-0",
                        !it.read ? "bg-brand-pink" : "bg-white/10"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium leading-tight truncate">
                          {it.title}
                        </p>
                        <span
                          className={cn(
                            "text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full border shrink-0",
                            ICON_TONE[it.type]
                          )}
                        >
                          {it.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {it.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                        {dateFormater(it.at, "MMM d, HH:mm")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-white/10 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {items.length} total
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              (window.location.href =
                variant === "admin"
                  ? "/admin/notifications"
                  : "/dashboard/support")
            }
            className="text-xs"
          >
            View all <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
