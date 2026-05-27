import { emitToUser, broadcastToAll } from "#socket/server.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Notification socket events
 * ============================================================
 *
 *  - notification:new          → a single new notification for a user
 *  - notification:read         → a notification was marked read (sync tabs)
 *  - notification:all_read     → all notifications were marked read
 *  - notification:deleted      → a notification was removed
 *  - notification:broadcast    → admin platform-wide payload (rendered by toast)
 *
 *  All payloads are best-effort — if the user is offline, the row still
 *  lives in MongoDB and they'll see it next time they open the app.
 */

const safeEmit = (fn) => {
  try {
    fn();
  } catch (err) {
    logger.warn("[notify] socket emit failed", { message: err.message });
  }
};

export const emitNotificationNew = (notification) => {
  if (!notification?.recipientUserId) return;
  safeEmit(() =>
    emitToUser(String(notification.recipientUserId), "notification:new", {
      notification: serializeForSocket(notification),
    })
  );
};

export const emitNotificationRead = ({ recipientUserId, id }) => {
  if (!recipientUserId || !id) return;
  safeEmit(() =>
    emitToUser(String(recipientUserId), "notification:read", {
      id: String(id),
    })
  );
};

export const emitNotificationAllRead = ({ recipientUserId }) => {
  if (!recipientUserId) return;
  safeEmit(() =>
    emitToUser(String(recipientUserId), "notification:all_read", {
      at: new Date().toISOString(),
    })
  );
};

export const emitNotificationDeleted = ({ recipientUserId, id }) => {
  if (!recipientUserId || !id) return;
  safeEmit(() =>
    emitToUser(String(recipientUserId), "notification:deleted", {
      id: String(id),
    })
  );
};

/**
 * Used by the broadcast service AFTER inserting per-user docs.
 * The broadcast body is shipped over the socket so all currently-connected
 * users get an immediate toast even before they refetch the inbox.
 */
export const emitBroadcastSocket = (payload) => {
  safeEmit(() => broadcastToAll("notification:broadcast", payload));
};

const serializeForSocket = (n) => ({
  _id: String(n._id),
  type: n.type,
  category: n.category,
  title: n.title,
  body: n.body,
  link: n.link,
  metadata: n.metadata || {},
  workspaceId: n.workspaceId ? String(n.workspaceId) : null,
  read: !!n.read,
  createdAt: n.createdAt,
});
