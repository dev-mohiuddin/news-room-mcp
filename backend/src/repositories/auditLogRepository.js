import { AuditLog } from "#models/auditLogModel.js";
import { paginateModel } from "#utils/paginationUtil.js";

export const paginatedAuditLogs = (params, { category, status, actorId, workspaceId } = {}) => {
  const baseQuery = {};
  if (category) baseQuery.category = category;
  if (status) baseQuery.status = status;
  if (actorId) baseQuery.actorId = actorId;
  if (workspaceId) baseQuery.workspaceId = workspaceId;

  return paginateModel(AuditLog, baseQuery, params, {
    searchFields: ["action", "actorEmail"],
  });
};
