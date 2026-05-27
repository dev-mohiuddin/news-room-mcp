import { Notification } from "#models/notificationModel.js";
import { paginateModel } from "#utils/paginationUtil.js";

/**
 * ============================================================
 *  Notification Repository
 * ============================================================
 *
 *  All recipient-scoped — `recipientUserId` is required everywhere
 *  except admin/audit reads (which we deliberately omit for now).
 */

export const createNotification = (payload) => Notification.create(payload);

/**
 * Bulk insert — used for broadcast fan-out. Returns the created docs.
 * Skips schema-level validation overhead with `lean: false` (we want
 * full documents to emit live socket events).
 */
export const insertManyNotifications = (docs) =>
  docs.length === 0 ? Promise.resolve([]) : Notification.insertMany(docs);

export const paginateInbox = (recipientUserId, params, filters = {}) => {
  const baseQuery = { recipientUserId };
  if (filters.category) baseQuery.category = filters.category;
  if (filters.unreadOnly) baseQuery.read = false;
  return paginateModel(Notification, baseQuery, params, {
    searchFields: ["title", "body"],
  });
};

export const countUnread = (recipientUserId) =>
  Notification.countDocuments({ recipientUserId, read: false }).exec();

export const findOwnNotificationById = (recipientUserId, id) =>
  Notification.findOne({ _id: id, recipientUserId }).exec();

export const markRead = (recipientUserId, id) =>
  Notification.findOneAndUpdate(
    { _id: id, recipientUserId, read: false },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  ).exec();

export const markAllRead = (recipientUserId) =>
  Notification.updateMany(
    { recipientUserId, read: false },
    { $set: { read: true, readAt: new Date() } }
  ).exec();

export const deleteOwnNotification = (recipientUserId, id) =>
  Notification.findOneAndDelete({ _id: id, recipientUserId }).exec();

export const deleteOwnReadNotifications = (recipientUserId) =>
  Notification.deleteMany({ recipientUserId, read: true }).exec();

/* ── Admin / broadcast-side ── */

export const paginateBroadcasts = (params) =>
  Notification.aggregate([
    { $match: { broadcastId: { $ne: null } } },
    {
      $group: {
        _id: "$broadcastId",
        subject: { $first: "$title" },
        body: { $first: "$body" },
        category: { $first: "$category" },
        type: { $first: "$type" },
        link: { $first: "$link" },
        recipients: { $sum: 1 },
        readCount: { $sum: { $cond: ["$read", 1, 0] } },
        sentAt: { $min: "$createdAt" },
        audience: { $first: "$metadata.audience" },
      },
    },
    { $sort: { sentAt: -1 } },
    { $skip: (params.page - 1) * params.perPage },
    { $limit: params.perPage },
  ]).exec();

export const countBroadcasts = async () => {
  const result = await Notification.aggregate([
    { $match: { broadcastId: { $ne: null } } },
    { $group: { _id: "$broadcastId" } },
    { $count: "total" },
  ]).exec();
  return result[0]?.total || 0;
};
