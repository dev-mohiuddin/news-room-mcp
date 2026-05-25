import express from "express";
import { listAuditLogs } from "#controllers/audit/auditController.js";
import { protect } from "#middlewares/authMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";

export const auditRouter = express.Router();

auditRouter.use(protect);

auditRouter.get(
  "/admin/audit-logs",
  requirePermission(PERMISSIONS.PLATFORM_AUDIT_READ),
  listAuditLogs
);

export default auditRouter;
