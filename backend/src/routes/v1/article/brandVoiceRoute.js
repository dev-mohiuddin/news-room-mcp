import express from "express";

import {
  listProfilesHandler,
  getProfileHandler,
  createProfileHandler,
  reExtractHandler,
  activateProfileHandler,
  deleteProfileHandler,
} from "#controllers/article/brandVoiceController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { tenantScope } from "#middlewares/tenantScopeMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { createRateLimiter } from "#middlewares/rateLimiterMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";

export const brandVoiceRouter = express.Router();

brandVoiceRouter.use("/brand-voice", protect, tenantScope);

brandVoiceRouter.get(
  "/brand-voice",
  requirePermission(PERMISSIONS.TENANT_BRAND_MANAGE),
  listProfilesHandler
);
brandVoiceRouter.get(
  "/brand-voice/:id",
  requirePermission(PERMISSIONS.TENANT_BRAND_MANAGE),
  getProfileHandler
);
brandVoiceRouter.post(
  "/brand-voice",
  createRateLimiter(20, 60),
  requirePermission(PERMISSIONS.TENANT_BRAND_MANAGE),
  createProfileHandler
);
brandVoiceRouter.post(
  "/brand-voice/:id/re-extract",
  requirePermission(PERMISSIONS.TENANT_BRAND_MANAGE),
  reExtractHandler
);
brandVoiceRouter.post(
  "/brand-voice/:id/activate",
  requirePermission(PERMISSIONS.TENANT_BRAND_MANAGE),
  activateProfileHandler
);
brandVoiceRouter.delete(
  "/brand-voice/:id",
  requirePermission(PERMISSIONS.TENANT_BRAND_MANAGE),
  deleteProfileHandler
);

export default brandVoiceRouter;
