import { paginatedAuditLogs } from "#repositories/auditLogRepository.js";
import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";

/* GET /api/v1/admin/audit-logs */
export const listAuditLogs = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["createdAt", "category", "action"],
  });

  const filters = {
    category: req.query.category || undefined,
    status: req.query.status || undefined,
    actorId: req.query.actorId || undefined,
    workspaceId: req.query.workspaceId || undefined,
  };

  const { items, meta } = await paginatedAuditLogs(params, filters);
  res.success({
    data: items,
    pagination: meta,
    message: "Audit logs fetched",
  });
});
