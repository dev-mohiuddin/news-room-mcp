import { logger } from "#utils/logger.js";
import { AuditLog } from "#models/auditLogModel.js";

/**
 * Persistent audit logger.
 *
 *   await logAudit({
 *     actor: req.user,
 *     category: "user",
 *     action: "user.role_changed",
 *     entityType: "user",
 *     entityId: targetUserId,
 *     before: { role: "writer" },
 *     after: { role: "editor" },
 *     req,
 *   });
 *
 * Never throws — audit failure must not break the user-facing operation.
 */
export const logAudit = async ({
  actor = null,
  actorId = null,
  actorEmail = null,
  actorRole = null,
  category,
  action,
  entityType = null,
  entityId = null,
  workspaceId = null,
  status = "success",
  before = null,
  after = null,
  metadata = {},
  req = null,
} = {}) => {
  try {
    if (!action || !category) return null;

    const payload = {
      actorId: actorId || actor?.id || actor?._id || null,
      actorEmail: actorEmail || actor?.email || null,
      actorRole: actorRole || actor?.role || null,
      category,
      action,
      entityType,
      entityId,
      workspaceId,
      status,
      before,
      after,
      metadata,
      ip: req?.ip || null,
      userAgent: req?.headers?.["user-agent"] || null,
    };

    const log = await AuditLog.create(payload);
    logger.info(`audit:${action}`, { actor: payload.actorEmail, target: entityId });
    return log;
  } catch (err) {
    logger.error("Audit log failed", {
      error: err.message,
      action,
      category,
    });
    return null;
  }
};
