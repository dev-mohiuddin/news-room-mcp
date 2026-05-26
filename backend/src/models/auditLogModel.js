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
// Cross-tenant audit lookups by workspace + time
auditLogSchema.index({ workspaceId: 1, createdAt: -1 });
// Filter by category + action + time (admin audit page common path)
auditLogSchema.index({ category: 1, action: 1, createdAt: -1 });
// Per-actor activity timeline (e.g. "show me what user X did")
auditLogSchema.index({ actorId: 1, createdAt: -1 });
// Entity history: "show me everything that happened to article Y"
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
// Status-only queries (failed actions investigation)
auditLogSchema.index({ status: 1, createdAt: -1 });
// TTL — auto-purge audit entries after 180 days unless overridden by env.
// Set AUDIT_LOG_RETENTION_DAYS=0 to disable expiry.
const auditRetentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? 180);
if (auditRetentionDays > 0) {
  auditLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: auditRetentionDays * 24 * 60 * 60, name: "audit_ttl" }
  );
}

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
