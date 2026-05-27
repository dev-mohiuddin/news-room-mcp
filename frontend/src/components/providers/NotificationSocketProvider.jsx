import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { getSocket } from "@/lib/socket";
import {
  receiveNotification,
  receiveRead,
  receiveAllRead,
  receiveDeleted,
  fetchUnreadCount,
} from "@/redux/slice/notification-slice";

/**
 * ============================================================
 *  Notification Socket Provider
 * ============================================================
 *
 *  Subscribes to:
 *    - notification:new          → push a new row + unread+1
 *    - notification:read         → multi-tab sync (mark read)
 *    - notification:all_read     → multi-tab sync (mark all read)
 *    - notification:deleted      → remove from list
 *    - notification:broadcast    → toast for admin platform-wide messages
 *
 *  Mounted next to ArticleSocketProvider in both layouts. The socket
 *  itself is a singleton (`getSocket`) so this never opens a second
 *  connection.
 */
export default function NotificationSocketProvider({ children }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const accessToken = useSelector((s) => s.auth.accessToken);

  /* Hydrate the badge once per session so the bell is correct on first render. */
  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchUnreadCount());
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const socket = getSocket();

    const onNew = (payload) => {
      const n = payload?.notification;
      dispatch(receiveNotification(payload));
      if (n) {
        const toastFn =
          n.type === "error"
            ? toast.error
            : n.type === "warning"
            ? toast.warning
            : n.type === "success"
            ? toast.success
            : toast.info;
        toastFn(n.title, {
          description: n.body || undefined,
          action: n.link
            ? {
                label: "View",
                onClick: () => {
                  window.location.href = n.link;
                },
              }
            : undefined,
        });
      }
    };

    const onRead = (payload) => dispatch(receiveRead(payload));
    const onAllRead = () => dispatch(receiveAllRead());
    const onDeleted = (payload) => dispatch(receiveDeleted(payload));
    const onBroadcast = (payload) => {
      // The broadcast also fans out a per-user `notification:new`,
      // so the toast lifecycle is owned by `onNew`. Here we only log
      // platform-wide so other layers (analytics) can hook in later.
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[notify] platform broadcast", payload);
      }
    };

    socket.on("notification:new", onNew);
    socket.on("notification:read", onRead);
    socket.on("notification:all_read", onAllRead);
    socket.on("notification:deleted", onDeleted);
    socket.on("notification:broadcast", onBroadcast);

    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:read", onRead);
      socket.off("notification:all_read", onAllRead);
      socket.off("notification:deleted", onDeleted);
      socket.off("notification:broadcast", onBroadcast);
    };
  }, [dispatch, isAuthenticated, accessToken]);

  return children ?? null;
}
