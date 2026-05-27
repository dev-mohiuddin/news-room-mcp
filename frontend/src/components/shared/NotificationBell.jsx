import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Bell, Check, ExternalLink, Trash2, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dateFormater, cn } from "@/lib/utils";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/redux/slice/notification-slice";

const ICON_TONE = {
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
};

/**
 * Notification bell — renders the live inbox from the notification slice.
 *
 *  - Unread count badge updates instantly via socket events
 *  - Popover open triggers a fresh inbox fetch (10 items)
 *  - Click row → mark as read + navigate to its `link` if present
 *  - "Mark all read" + per-row delete supported
 */
export default function NotificationBell({ variant = "user" }) {
  const dispatch = useDispatch();

  const items = useSelector((s) => s.notifications.list);
  const unread = useSelector((s) => s.notifications.unreadCount);
  const isLoading = useSelector((s) => s.notifications.isLoading);

  /* Hydrate the inbox on mount so the bell is non-empty even before opening. */
  useEffect(() => {
    dispatch(fetchNotifications({ perPage: 10 }));
  }, [dispatch]);

  const handleOpenChange = (open) => {
    if (open) dispatch(fetchNotifications({ perPage: 10 }));
  };

  const handleRowClick = (n) => {
    if (!n.read) dispatch(markNotificationRead(n._id));
    if (n.link) {
      window.location.href = n.link;
    }
  };

  const handleMarkAllRead = (e) => {
    e?.stopPropagation();
    dispatch(markAllNotificationsRead());
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    dispatch(deleteNotification(id));
  };

  const goToFullInbox = () => {
    window.location.href =
      variant === "admin" ? "/admin/notifications" : "/dashboard/support";
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
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
                {unread > 99 ? "99+" : unread}
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
        className="w-[380px] p-0 overflow-hidden border-white/10"
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
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground"
            >
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[380px]">
          {isLoading && items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map((it) => (
                <li
                  key={it._id}
                  onClick={() => handleRowClick(it)}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.03] group",
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
                            ICON_TONE[it.type] || ICON_TONE.info
                          )}
                        >
                          {it.type}
                        </span>
                      </div>
                      {it.body && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {it.body}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-muted-foreground/70">
                          {dateFormater(it.createdAt, "MMM d, HH:mm")}
                          <span className="mx-1">·</span>
                          <span className="capitalize">{it.category}</span>
                        </p>
                        <button
                          onClick={(e) => handleDelete(e, it._id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-white/10 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {items.length} shown
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToFullInbox}
            className="text-xs"
          >
            View all <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
