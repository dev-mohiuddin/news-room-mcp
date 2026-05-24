import { catchAsync } from "#utils/catchAsync.js";
import { listAuditLogs } from "#services/audit/auditService.js";

export const getAuditLogsController = catchAsync(async (req, res) => {
  const { page, limit, action, actorId, entity, entityId } = req.query;
  const logs = await listAuditLogs({ page, limit, action, actorId, entity, entityId });
  res.success({ data: logs, message: "Audit logs retrieved" });
});
