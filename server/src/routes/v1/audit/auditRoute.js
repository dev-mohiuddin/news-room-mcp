import express from "express";
import { protect, authorize } from "#middlewares/authMiddleware.js";
import { getAuditLogsController } from "#controllers/audit/auditController.js";

export const auditRouter = express.Router();

auditRouter.get(
  "/audit-logs",
  protect,
  authorize("platform.audit:read"),
  getAuditLogsController
);
