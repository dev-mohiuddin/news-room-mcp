import express from "express";

import {
  listAllArticles,
  toggleHide,
  toggleFlag,
} from "#controllers/admin/contentController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { PERMISSIONS } from "#constants/roles.js";

export const adminContentRouter = express.Router();

adminContentRouter.use(protect);

/**
 * Mount path: /api/v1/admin/articles
 * Permission: platform.content:moderate (super admin gets it via *)
 */
adminContentRouter.get(
  "/admin/articles",
  requirePermission(PERMISSIONS.PLATFORM_CONTENT_MODERATE),
  listAllArticles
);

adminContentRouter.patch(
  "/admin/articles/:id/hide",
  requirePermission(PERMISSIONS.PLATFORM_CONTENT_MODERATE),
  toggleHide
);

adminContentRouter.patch(
  "/admin/articles/:id/flag",
  requirePermission(PERMISSIONS.PLATFORM_CONTENT_MODERATE),
  toggleFlag
);

export default adminContentRouter;
