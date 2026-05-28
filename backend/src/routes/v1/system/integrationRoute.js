import express from "express";

import {
  listIntegrationsHandler,
  upsertIntegrationHandler,
  setIntegrationActiveHandler,
  deleteIntegrationHandler,
  testIntegrationHandler,
} from "#controllers/system/integrationController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createRateLimiter,
  createStrictRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";
import {
  upsertIntegrationSchema,
  providerParamSchema,
  setActiveSchema,
} from "#validations/system/integrationValidation.js";

export const integrationRouter = express.Router();

integrationRouter.use("/admin/integrations", protect);

integrationRouter.get(
  "/admin/integrations",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.PLATFORM_INTEGRATION_MANAGE),
  listIntegrationsHandler
);

integrationRouter.put(
  "/admin/integrations",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.PLATFORM_INTEGRATION_MANAGE),
  validate(upsertIntegrationSchema),
  upsertIntegrationHandler
);

integrationRouter.patch(
  "/admin/integrations/:provider/active",
  createStrictRateLimiter(60, 5),
  requirePermission(PERMISSIONS.PLATFORM_INTEGRATION_MANAGE),
  validate(setActiveSchema),
  setIntegrationActiveHandler
);

integrationRouter.delete(
  "/admin/integrations/:provider",
  createStrictRateLimiter(15, 5),
  requirePermission(PERMISSIONS.PLATFORM_INTEGRATION_MANAGE),
  validate(providerParamSchema),
  deleteIntegrationHandler
);

integrationRouter.post(
  "/admin/integrations/:provider/test",
  createStrictRateLimiter(30, 5),
  requirePermission(PERMISSIONS.PLATFORM_INTEGRATION_MANAGE),
  validate(providerParamSchema),
  testIntegrationHandler
);

export default integrationRouter;
