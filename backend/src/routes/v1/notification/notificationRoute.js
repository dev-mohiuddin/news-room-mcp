import express from "express";

import {
  listInbox,
  unreadCount,
  readOne,
  readAll,
  deleteOne,
  clearRead,
  sendBroadcast,
  listBroadcasts,
} from "#controllers/notification/notificationController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createRateLimiter,
  createStrictRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";
import {
  idParamSchema,
  listInboxQuerySchema,
  sendBroadcastSchema,
  listBroadcastsQuerySchema,
} from "#validations/notification/notificationValidation.js";

export const notificationRouter = express.Router();

/* ── User-facing inbox ── */
notificationRouter.use("/notifications", protect);

notificationRouter.get(
  "/notifications",
  createRateLimiter(120, 5),
  validate(listInboxQuerySchema),
  listInbox
);

notificationRouter.get(
  "/notifications/unread-count",
  createRateLimiter(240, 5),
  unreadCount
);

notificationRouter.patch(
  "/notifications/:id/read",
  validate(idParamSchema),
  readOne
);

notificationRouter.post(
  "/notifications/read-all",
  createStrictRateLimiter(20, 5),
  readAll
);

notificationRouter.delete(
  "/notifications/read",
  createStrictRateLimiter(10, 5),
  clearRead
);

notificationRouter.delete(
  "/notifications/:id",
  validate(idParamSchema),
  deleteOne
);

/* ── Admin broadcasts ── */
notificationRouter.post(
  "/admin/broadcasts",
  protect,
  createStrictRateLimiter(10, 60),
  requirePermission(PERMISSIONS.PLATFORM_BROADCAST_SEND),
  validate(sendBroadcastSchema),
  sendBroadcast
);

notificationRouter.get(
  "/admin/broadcasts",
  protect,
  requirePermission(PERMISSIONS.PLATFORM_BROADCAST_SEND),
  validate(listBroadcastsQuerySchema),
  listBroadcasts
);

export default notificationRouter;
