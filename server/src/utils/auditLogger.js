import { AuditLog } from "#models/auditLogModel.js";

export const logAudit = async ({
  actorId,
  actorRole,
  action,
  entity,
  entityId,
  before = null,
  after = null,
  metadata = {},
}) => {
  return AuditLog.create({
    actorId,
    actorRole,
    action,
    entity,
    entityId,
    before,
    after,
    metadata,
  });
};
