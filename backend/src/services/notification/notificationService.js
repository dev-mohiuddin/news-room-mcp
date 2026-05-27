import mongoose from "mongoose";

import { logger } from "#utils/logger.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import { User } from "#models/userModel.js";
import { Subscription } from "#models/subscriptionModel.js";
import { Workspace } from "#models/workspaceModel.js";
import {
  createNotification,
  insertManyNotifications,
  paginateInbox,
  countUnread,
  findOwnNotificationById,
  markRead,
  markAllRead,
  deleteOwnNotification,
  deleteOwnReadNotifications,
  paginateBroadcasts,
  countBroadcasts,
} from "#repositories/notificationRepository.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
} from "#models/notificationModel.js";
import {
  emitNotificationNew,
  emitNotificationRead,
  emitNotificationAllRead,
  emitNotificationDeleted,
  emitBroadcastSocket,
} from "#socket/notificationEvents.js";
import { buildPaginationMeta } from "#utils/paginationUtil.js";

/**
 * ============================================================
 *  Notification Service
 * ============================================================
 *
 *  Public API used by other services (article pipeline, billing,
 *  team service) and by the controller layer.
 */

/* ── Recipient inbox ──────────────────────────────────────── */

export const getInbox = async (userId, params, filters) => {
  const { items, meta } = await paginateInbox(userId, params, filters);
  const unread = await countUnread(userId);
  return { items, meta: { ...meta, unread } };
};

export const getUnreadCount = (userId) => countUnread(userId);

export const markOneRead = async (userId, id) => {
  const existing = await findOwnNotificationById(userId, id);
  if (!existing) throwError("Notification not found", 404);
  if (existing.read) return existing;

  const updated = await markRead(userId, id);
  emitNotificationRead({ recipientUserId: userId, id });
  return updated;
};

export const markEveryRead = async (userId) => {
  const result = await markAllRead(userId);
  emitNotificationAllRead({ recipientUserId: userId });
  return { matched: result.matchedCount || 0, modified: result.modifiedCount || 0 };
};

export const removeOne = async (userId, id) => {
  const removed = await deleteOwnNotification(userId, id);
  if (!removed) throwError("Notification not found", 404);
  emitNotificationDeleted({ recipientUserId: userId, id });
  return removed;
};

export const clearReadInbox = async (userId) => {
  const result = await deleteOwnReadNotifications(userId);
  return { deleted: result.deletedCount || 0 };
};

/* ── Producer API (used by other services) ────────────────── */

const validate = ({ type, category }) => {
  if (type && !NOTIFICATION_TYPES.includes(type)) {
    throwError(`Invalid notification type '${type}'`, 400);
  }
  if (!NOTIFICATION_CATEGORIES.includes(category)) {
    throwError(`Invalid notification category '${category}'`, 400);
  }
};

/**
 * Send a notification to a single user. Producers must call this rather
 * than touching the repository directly so socket emission stays in sync.
 */
export const notifyUser = async ({
  recipientUserId,
  workspaceId = null,
  type = "info",
  category,
  title,
  body = "",
  link = null,
  metadata = {},
}) => {
  if (!recipientUserId) throwError("recipientUserId is required", 400);
  if (!title) throwError("title is required", 400);
  validate({ type, category });

  const doc = await createNotification({
    recipientUserId,
    workspaceId,
    type,
    category,
    title,
    body,
    link,
    metadata,
  });

  emitNotificationNew(doc);
  return doc;
};

/**
 * Send the same notification to every member of a workspace. Used by
 * billing alerts ("payment failed") and team events ("member joined").
 */
export const notifyWorkspace = async ({
  workspaceId,
  type = "info",
  category,
  title,
  body = "",
  link = null,
  metadata = {},
  excludeUserIds = [],
}) => {
  if (!workspaceId) throwError("workspaceId is required", 400);
  validate({ type, category });

  const excludeSet = new Set(excludeUserIds.map(String));
  const members = await User.find({ workspaceId })
    .select("_id")
    .lean()
    .exec();

  const docs = members
    .filter((m) => !excludeSet.has(String(m._id)))
    .map((m) => ({
      recipientUserId: m._id,
      workspaceId,
      type,
      category,
      title,
      body,
      link,
      metadata,
    }));

  if (docs.length === 0) return [];

  const created = await insertManyNotifications(docs);
  for (const doc of created) emitNotificationNew(doc);
  return created;
};

/* ── Admin broadcast ──────────────────────────────────────── */

const AUDIENCES = {
  all: { label: "All users" },
  paying: { label: "Paying customers" },
  pro: { label: "Pro + Agency" },
  free: { label: "Free plan" },
};

const resolveAudienceUsers = async (audience) => {
  if (!AUDIENCES[audience]) {
    throwError(`Invalid audience '${audience}'`, 400);
  }
  if (audience === "all") {
    return User.find({ isActive: true }).select("_id workspaceId").lean().exec();
  }
  // Plan-based audiences: collect workspaceIds matching the plan filter,
  // then load every user inside those workspaces.
  let planFilter = null;
  if (audience === "paying") planFilter = { plan: { $in: ["starter", "pro", "agency"] } };
  if (audience === "pro") planFilter = { plan: { $in: ["pro", "agency"] } };
  if (audience === "free") planFilter = { plan: "free" };

  const subs = await Subscription.find({ status: { $ne: "canceled" }, ...planFilter })
    .select("workspaceId")
    .lean()
    .exec();
  const workspaceIds = subs.map((s) => s.workspaceId);
  if (!workspaceIds.length) return [];
  return User.find({ workspaceId: { $in: workspaceIds }, isActive: true })
    .select("_id workspaceId")
    .lean()
    .exec();
};

/**
 * Admin-only platform broadcast.
 *
 *  - Resolves the recipient list by audience tier
 *  - Bulk-inserts one Notification per recipient with a shared broadcastId
 *  - Emits a single platform-wide socket event so connected users see a toast
 *  - Logs an audit entry under category="system", action="broadcast.sent"
 *
 *  Returns: { broadcastId, recipients, sample }
 */
export const sendBroadcast = async ({
  actor,
  subject,
  body = "",
  audience = "all",
  type = "info",
  link = null,
  req,
}) => {
  if (!subject?.trim()) throwError("Subject is required", 400);
  validate({ type, category: "broadcast" });

  const recipients = await resolveAudienceUsers(audience);
  if (recipients.length === 0) {
    throwError("No recipients matched the selected audience", 400);
  }

  const broadcastId = new mongoose.Types.ObjectId();
  const sentAt = new Date();
  const docs = recipients.map((u) => ({
    recipientUserId: u._id,
    workspaceId: u.workspaceId || null,
    type,
    category: "broadcast",
    title: subject,
    body,
    link,
    broadcastId,
    metadata: { audience, audienceLabel: AUDIENCES[audience].label, sentAt },
  }));

  const created = await insertManyNotifications(docs);

  // Push a single platform-wide socket event so currently-connected users
  // see a toast immediately, AND emit a per-user `notification:new` so
  // their bell badge increments without a refetch.
  emitBroadcastSocket({
    broadcastId: String(broadcastId),
    type,
    category: "broadcast",
    title: subject,
    body,
    link,
    audience,
    audienceLabel: AUDIENCES[audience].label,
    recipients: created.length,
    sentAt: sentAt.toISOString(),
  });
  for (const doc of created) emitNotificationNew(doc);

  await logAudit({
    actor,
    category: "system",
    action: "broadcast.sent",
    entityType: "broadcast",
    entityId: broadcastId,
    after: {
      subject,
      audience,
      recipients: created.length,
    },
    req,
  });

  logger.info("[notify] broadcast sent", {
    broadcastId: String(broadcastId),
    audience,
    recipients: created.length,
  });

  return {
    broadcastId,
    recipients: created.length,
    audience,
    audienceLabel: AUDIENCES[audience].label,
    sentAt,
  };
};

export const listBroadcasts = async (params) => {
  const total = await countBroadcasts();
  const items = await paginateBroadcasts(params);
  const meta = buildPaginationMeta({
    page: params.page,
    perPage: params.perPage,
    total,
    sortBy: "sentAt",
    sortOrder: "desc",
    filters: {},
  });
  return { items, meta };
};
