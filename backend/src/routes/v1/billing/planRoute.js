import express from "express";

import {
  listPublicPlans,
  listAdminPlans,
  getAdminPlan,
  createAdminPlan,
  updateAdminPlan,
  toggleAdminPlanActive,
  deleteAdminPlan,
} from "#controllers/billing/planController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createRateLimiter,
  createStrictRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";
import {
  idParamSchema,
  listPlansQuerySchema,
  createPlanSchema,
  updatePlanSchema,
  setActiveSchema,
} from "#validations/billing/planValidation.js";

export const planRouter = express.Router();

/* ── Public — read only, used by the landing & pricing pages ── */
planRouter.get(
  "/plans",
  createRateLimiter(120, 5),
  listPublicPlans
);

/* ── Admin — full CRUD ── */
planRouter.use("/admin/plans", protect);

planRouter.get(
  "/admin/plans",
  requirePermission(PERMISSIONS.PLATFORM_PLAN_MANAGE),
  validate(listPlansQuerySchema),
  listAdminPlans
);

planRouter.get(
  "/admin/plans/:id",
  requirePermission(PERMISSIONS.PLATFORM_PLAN_MANAGE),
  validate(idParamSchema),
  getAdminPlan
);

planRouter.post(
  "/admin/plans",
  createStrictRateLimiter(20, 60),
  requirePermission(PERMISSIONS.PLATFORM_PLAN_MANAGE),
  validate(createPlanSchema),
  createAdminPlan
);

planRouter.patch(
  "/admin/plans/:id",
  createStrictRateLimiter(60, 60),
  requirePermission(PERMISSIONS.PLATFORM_PLAN_MANAGE),
  validate(updatePlanSchema),
  updateAdminPlan
);

planRouter.patch(
  "/admin/plans/:id/active",
  createStrictRateLimiter(60, 60),
  requirePermission(PERMISSIONS.PLATFORM_PLAN_MANAGE),
  validate(setActiveSchema),
  toggleAdminPlanActive
);

planRouter.delete(
  "/admin/plans/:id",
  createStrictRateLimiter(20, 60),
  requirePermission(PERMISSIONS.PLATFORM_PLAN_MANAGE),
  validate(idParamSchema),
  deleteAdminPlan
);

export default planRouter;
