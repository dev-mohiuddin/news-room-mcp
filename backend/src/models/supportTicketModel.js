import mongoose from "mongoose";

/**
 * ============================================================
 *  SupportTicket Model
 * ============================================================
 *
 *  One document per ticket. Replies are an embedded subdoc array —
 *  for typical support volume this is far cheaper than a separate
 *  collection and lets us atomically push replies + bump `updatedAt`
 *  in one write. If a workspace ever exceeds ~500 replies on a single
 *  ticket we'll split out a `SupportReply` collection.
 *
 *  Two visibility surfaces:
 *    - Tenant: list/read/reply/close their OWN tickets only
 *    - Admin:  list/read/reply/close every workspace's tickets
 *
 *  Status machine:
 *    open       — newly created, awaiting staff reply
 *    pending    — staff replied, awaiting customer reply
 *    resolved   — staff/customer marked resolved (re-openable)
 *    closed     — terminal (cannot reply)
 */

export const TICKET_STATUSES = ["open", "pending", "resolved", "closed"];
export const TICKET_PRIORITIES = ["low", "medium", "high"];
export const REPLY_AUTHOR_KINDS = ["customer", "staff", "system"];

const replySchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    authorKind: {
      type: String,
      enum: REPLY_AUTHOR_KINDS,
      default: "customer",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    authorName: { type: String, default: null, maxlength: 120 },
    authorEmail: { type: String, default: null, lowercase: true, maxlength: 200 },
    /* For status changes / system events we still write a row but with no body */
    statusChange: {
      from: { type: String, default: null },
      to: { type: String, default: null },
    },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    /* First message body — stored separately so threads always have a head row */
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: "open",
      required: true,
      index: true,
    },
    /* Reply thread (excluding the initial body) */
    replies: { type: [replySchema], default: [] },
    repliesCount: { type: Number, default: 0 },

    /* Quick render data */
    customerEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      maxlength: 200,
    },
    customerName: { type: String, default: null, trim: true, maxlength: 120 },

    /* Admin-side metadata */
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    /* Lifecycle */
    lastReplyAt: { type: Date, default: () => new Date() },
    lastReplyBy: {
      type: String,
      enum: REPLY_AUTHOR_KINDS,
      default: "customer",
    },
    closedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

/* ── Indexes ── */
// Tenant inbox (per workspace, newest first)
supportTicketSchema.index({ workspaceId: 1, createdAt: -1 });
supportTicketSchema.index({ workspaceId: 1, status: 1, lastReplyAt: -1 });
// Admin global inbox
supportTicketSchema.index({ status: 1, priority: 1, lastReplyAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1, lastReplyAt: -1 });
// Search support
supportTicketSchema.index({ subject: "text", body: "text" });

export const SupportTicket = mongoose.model(
  "SupportTicket",
  supportTicketSchema
);
export default SupportTicket;
