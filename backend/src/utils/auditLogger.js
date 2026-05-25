import { logger } from "#utils/logger.js";

/**
 * Generic audit logger — currently writes to logger only.
 *
 * When an AuditLog model is added, replace the body to also persist:
 *   await AuditLog.create({ ... });
 */
export const logAudit = async ({
  actorId = null,
  actorRole = null,
  action,
  entity,
  entityId = null,
  before = null,
  after = null,
  metadata = {},
} = {}) => {
  if (!action || !entity) return;

  const payload = {
    actorId,
    actorRole,
    action,
    entity,
    entityId,
    before,
    after,
    metadata,
    at: new Date().toISOString(),
  };

  logger.info("audit", payload);

  // TODO: persist to AuditLog collection once the model is added.
  // const { AuditLog } = await import("#models/auditLogModel.js");
  // return AuditLog.create(payload);
};
