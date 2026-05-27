import express from "express";

import {
  listTemplatesHandler,
  getTemplateHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
  useTemplateHandler,
} from "#controllers/article/templateController.js";

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
  createTemplateSchema,
  updateTemplateSchema,
  templateIdParamSchema,
  listTemplatesQuerySchema,
} from "#validations/article/templateValidation.js";

export const templateRouter = express.Router();

templateRouter.use("/templates", protect, tenantScope);

templateRouter.get(
  "/templates",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_TEMPLATE_MANAGE),
  validate(listTemplatesQuerySchema),
  listTemplatesHandler
);

templateRouter.get(
  "/templates/:id",
  requirePermission(PERMISSIONS.TENANT_TEMPLATE_MANAGE),
  validate(templateIdParamSchema),
  getTemplateHandler
);

templateRouter.post(
  "/templates",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_TEMPLATE_MANAGE),
  validate(createTemplateSchema),
  createTemplateHandler
);

templateRouter.patch(
  "/templates/:id",
  createStrictRateLimiter(60, 5),
  requirePermission(PERMISSIONS.TENANT_TEMPLATE_MANAGE),
  validate(updateTemplateSchema),
  updateTemplateHandler
);

templateRouter.delete(
  "/templates/:id",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_TEMPLATE_MANAGE),
  validate(templateIdParamSchema),
  deleteTemplateHandler
);

templateRouter.post(
  "/templates/:id/use",
  createRateLimiter(60, 5),
  requirePermission(PERMISSIONS.TENANT_TEMPLATE_MANAGE),
  validate(templateIdParamSchema),
  useTemplateHandler
);

export default templateRouter;
