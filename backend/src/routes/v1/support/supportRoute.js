import express from "express";

import {
  listMyTickets,
  myStats,
  getMyTicket,
  createTicket,
  replyToMyTicket,
  tenantChangeStatus,
  listAllTickets,
  adminStats,
  getAdminTicket,
  replyAsStaff,
  adminChangeStatus,
  adminChangePriority,
  adminAssignTo,
} from "#controllers/support/supportTicketController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { tenantScope } from "#middlewares/tenantScopeMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createRateLimiter,
  createStrictRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";
import {
  idParamSchema,
  listQuerySchema,
  adminListQuerySchema,
  createTicketSchema,
  replySchema,
  statusSchema,
  prioritySchema,
  assignSchema,
} from "#validations/support/supportTicketValidation.js";

export const supportRouter = express.Router();

/* ──────────────────────────────────────────────────────────
 *  Tenant routes
 *  Any authenticated workspace member can open a support ticket —
 *  no tenant.* permission required (support is universal).
 * ────────────────────────────────────────────────────────── */
supportRouter.use("/support", protect, tenantScope);

supportRouter.get(
  "/support/tickets/stats",
  createRateLimiter(120, 5),
  myStats
);

supportRouter.get(
  "/support/tickets",
  createRateLimiter(120, 5),
  validate(listQuerySchema),
  listMyTickets
);

supportRouter.post(
  "/support/tickets",
  createStrictRateLimiter(20, 60),
  validate(createTicketSchema),
  createTicket
);

supportRouter.get(
  "/support/tickets/:id",
  validate(idParamSchema),
  getMyTicket
);

supportRouter.post(
  "/support/tickets/:id/reply",
  createStrictRateLimiter(60, 5),
  validate(replySchema),
  replyToMyTicket
);

supportRouter.patch(
  "/support/tickets/:id/status",
  createStrictRateLimiter(30, 5),
  validate(statusSchema),
  tenantChangeStatus
);

/* ──────────────────────────────────────────────────────────
 *  Admin routes (platform.support:manage)
 * ────────────────────────────────────────────────────────── */
supportRouter.get(
  "/admin/support/stats",
  protect,
  requirePermission(PERMISSIONS.PLATFORM_SUPPORT_MANAGE),
  adminStats
);

supportRouter.get(
  "/admin/support/tickets",
  protect,
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.PLATFORM_SUPPORT_MANAGE),
  validate(adminListQuerySchema),
  listAllTickets
);

supportRouter.get(
  "/admin/support/tickets/:id",
  protect,
  requirePermission(PERMISSIONS.PLATFORM_SUPPORT_MANAGE),
  validate(idParamSchema),
  getAdminTicket
);

supportRouter.post(
  "/admin/support/tickets/:id/reply",
  protect,
  createStrictRateLimiter(60, 5),
  requirePermission(PERMISSIONS.PLATFORM_SUPPORT_MANAGE),
  validate(replySchema),
  replyAsStaff
);

supportRouter.patch(
  "/admin/support/tickets/:id/status",
  protect,
  createStrictRateLimiter(60, 5),
  requirePermission(PERMISSIONS.PLATFORM_SUPPORT_MANAGE),
  validate(statusSchema),
  adminChangeStatus
);

supportRouter.patch(
  "/admin/support/tickets/:id/priority",
  protect,
  createStrictRateLimiter(60, 5),
  requirePermission(PERMISSIONS.PLATFORM_SUPPORT_MANAGE),
  validate(prioritySchema),
  adminChangePriority
);

supportRouter.patch(
  "/admin/support/tickets/:id/assign",
  protect,
  createStrictRateLimiter(60, 5),
  requirePermission(PERMISSIONS.PLATFORM_SUPPORT_MANAGE),
  validate(assignSchema),
  adminAssignTo
);

export default supportRouter;
