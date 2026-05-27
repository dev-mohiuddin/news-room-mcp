import mongoose from "mongoose";

/**
 * ============================================================
 *  Notification Model
 * ============================================================
 *
 *  One document per delivered in-app notification. Broadcast fan-out
 *  writes one doc per recipient (links them via `broadcastId`).
 *
 *  Categories:
 *    article    — pipeline events (draft_ready, failed, published)
 *    team       — invitations, role changes, member removed
 *    billing    — payment failed, plan changed, quota warning
 *    system     — settings changes, integration alerts
 *    broadcast  — admin platform-wide announcements
 *    support    — ticket replies / status changes
 *
 *  Types (visual severity):
 *    info | success | warning | error
 */

export const NOTIFICATION_TYPES = ["info", "success", "warning", "error"];
export const NOTIFICATION_CATEGORIES = [
  "article",
  "team",
  "billing",
  "system",
  "broadcast",
  "support",
];

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /* Optional — set when the notification belongs to a tenant context. */
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "info",
    },
    category: {
      type: String,
      enum: NOTIFICATION_CATEGORIES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    link: {
      type: String,
      default: null,
      maxlength: 500,
    },
    metadata: {
      type: Object,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    /* Groups all rows produced by a single admin broadcast send. */
    broadcastId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

/* ── Indexes ── */
// Inbox listing — primary read path
notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
// Unread count — hot endpoint
notificationSchema.index({ recipientUserId: 1, read: 1 });
// Filter by category in inbox
notificationSchema.index({ recipientUserId: 1, category: 1, createdAt: -1 });

// Auto-purge after 90 days unless overridden by env (set 0 to disable).
const retentionDays = Number(process.env.NOTIFICATION_RETENTION_DAYS ?? 90);
if (retentionDays > 0) {
  notificationSchema.index(
    { createdAt: 1 },
    {
      expireAfterSeconds: retentionDays * 24 * 60 * 60,
      name: "notification_ttl",
    }
  );
}

export const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
