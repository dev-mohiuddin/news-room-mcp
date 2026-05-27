import * as notificationService from "#services/notification/notificationService.js";
import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";

/* ─────────────────────────────────────────────────────────────
 *  User-facing inbox (any authenticated user)
 * ───────────────────────────────────────────────────────────── */

/* GET /api/v1/notifications */
export const listInbox = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["createdAt", "category", "type"],
  });
  const filters = {
    category: req.query.category,
    unreadOnly: req.query.unreadOnly === true || req.query.unreadOnly === "true",
  };
  const { items, meta } = await notificationService.getInbox(
    req.user.id,
    params,
    filters
  );
  res.success({
    data: items,
    pagination: meta,
    message: "Notifications fetched",
  });
});

/* GET /api/v1/notifications/unread-count */
export const unreadCount = catchAsync(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  res.success({ data: { count }, message: "Unread count" });
});

/* PATCH /api/v1/notifications/:id/read */
export const readOne = catchAsync(async (req, res) => {
  const updated = await notificationService.markOneRead(
    req.user.id,
    req.params.id
  );
  res.success({ data: updated, message: "Notification marked as read" });
});

/* POST /api/v1/notifications/read-all */
export const readAll = catchAsync(async (req, res) => {
  const result = await notificationService.markEveryRead(req.user.id);
  res.success({ data: result, message: "All notifications marked as read" });
});

/* DELETE /api/v1/notifications/:id */
export const deleteOne = catchAsync(async (req, res) => {
  await notificationService.removeOne(req.user.id, req.params.id);
  res.status(204).end();
});

/* DELETE /api/v1/notifications/read */
export const clearRead = catchAsync(async (req, res) => {
  const result = await notificationService.clearReadInbox(req.user.id);
  res.success({ data: result, message: "Read notifications cleared" });
});

/* ─────────────────────────────────────────────────────────────
 *  Admin-only — broadcast composer + history
 * ───────────────────────────────────────────────────────────── */

/* POST /api/v1/admin/broadcasts */
export const sendBroadcast = catchAsync(async (req, res) => {
  const result = await notificationService.sendBroadcast({
    actor: req.user,
    subject: req.body.subject,
    body: req.body.body || "",
    audience: req.body.audience || "all",
    type: req.body.type || "info",
    link: req.body.link || null,
    req,
  });
  res.success({
    statusCode: 201,
    data: result,
    message: `Broadcast sent to ${result.recipients} recipients`,
  });
});

/* GET /api/v1/admin/broadcasts */
export const listBroadcasts = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "sentAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["sentAt"],
  });
  const { items, meta } = await notificationService.listBroadcasts(params);
  res.success({
    data: items,
    pagination: meta,
    message: "Broadcast history",
  });
});
