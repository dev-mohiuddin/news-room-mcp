import { getAuditLogs } from "#repositories/auditLogRepository.js";

export const listAuditLogs = async (filters = {}) => {
  const { page = 1, limit = 50, action, actorId, entity, entityId } = filters;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const pageSize = Math.min(parseInt(limit), 100);

  const query = {};
  if (action) query.action = action;
  if (actorId) query.actorId = actorId;
  if (entity) query.entity = entity;
  if (entityId) query.entityId = entityId;

  const logs = await getAuditLogs(query, skip, pageSize);
  return logs;
};
