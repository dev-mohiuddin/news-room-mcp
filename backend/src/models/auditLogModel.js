import mongoose from "mongoose";

/**
 * AuditLog = immutable record of privileged actions.
 *
 * Categories:
 *  - auth:        login, logout, login_failed
 *  - user:        user.role_changed, user.suspended, user.activated, user.deleted
 *  - role:        role.created, role.updated, role.deleted
 *  - team:        team.invited, team.invite_accepted, team.invite_cancelled,
 *                 team.member_removed, team.role_changed
 *  - billing:     billing.plan_changed, billing.refund_issued
 *  - content:     content.flagged, content.deleted
 */
const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorEmail: { type: String, default: null },
    actorRole: { type: String, default: null },

    category: {
      type: String,
      enum: ["auth", "user", "role", "team", "billing", "content", "system"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },

    entityType: { type: String, default: null },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["success", "warning", "error"],
      default: "success",
      index: true,
    },

    before: { type: Object, default: null },
    after: { type: Object, default: null },
    metadata: { type: Object, default: {} },

    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
