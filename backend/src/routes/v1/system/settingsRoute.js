import express from "express";

import {
  getPublicSettings,
  getAdminSettings,
  patchSection,
  replaceFeatureFlags,
  toggleFeatureFlag,
} from "#controllers/system/systemSettingsController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createRateLimiter,
  createStrictRateLimiter,
} from "#middlewares/rateLimiterMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";
import {
  updateSectionSchema,
  replaceFlagsSchema,
  toggleFlagSchema,
} from "#validations/system/systemSettingsValidation.js";

export const settingsRouter = express.Router();

/* ── Public read (landing page + maintenance banner) ── */
settingsRouter.get(
  "/settings/public",
  createRateLimiter(240, 5),
  getPublicSettings
);

/* ── Admin ── */
settingsRouter.get(
  "/admin/settings",
  protect,
  requirePermission(PERMISSIONS.PLATFORM_SETTINGS_MANAGE),
  getAdminSettings
);

settingsRouter.patch(
  "/admin/settings/:section",
  protect,
  createStrictRateLimiter(60, 5),
  requirePermission(PERMISSIONS.PLATFORM_SETTINGS_MANAGE),
  validate(updateSectionSchema),
  patchSection
);

settingsRouter.put(
  "/admin/settings/feature-flags",
  protect,
  createStrictRateLimiter(30, 5),
  requirePermission(PERMISSIONS.PLATFORM_SETTINGS_MANAGE),
  validate(replaceFlagsSchema),
  replaceFeatureFlags
);

settingsRouter.patch(
  "/admin/settings/feature-flags/:flagId",
  protect,
  createStrictRateLimiter(60, 5),
  requirePermission(PERMISSIONS.PLATFORM_SETTINGS_MANAGE),
  validate(toggleFlagSchema),
  toggleFeatureFlag
);

export default settingsRouter;
