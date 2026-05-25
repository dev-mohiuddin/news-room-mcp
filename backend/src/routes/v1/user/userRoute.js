import express from "express";

import {
  listUsers,
  getUser,
  changeRole,
  setStatus,
  deleteUser,
} from "#controllers/user/userController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";

import {
  changeRoleSchema,
  setStatusSchema,
  userIdParamSchema,
} from "#validations/user/userValidation.js";

import { PERMISSIONS } from "#constants/roles.js";

export const adminUserRouter = express.Router();

adminUserRouter.use(protect);

/* Read — anyone with platform.user:read */
adminUserRouter.get(
  "/admin/users",
  requirePermission(PERMISSIONS.PLATFORM_USER_READ),
  listUsers
);
adminUserRouter.get(
  "/admin/users/:id",
  requirePermission(PERMISSIONS.PLATFORM_USER_READ),
  validate(userIdParamSchema),
  getUser
);

/* Write — platform.user:manage */
adminUserRouter.patch(
  "/admin/users/:id/role",
  requirePermission(PERMISSIONS.PLATFORM_USER_MANAGE),
  validate(changeRoleSchema),
  changeRole
);
adminUserRouter.patch(
  "/admin/users/:id/status",
  requirePermission(PERMISSIONS.PLATFORM_USER_MANAGE),
  validate(setStatusSchema),
  setStatus
);
adminUserRouter.delete(
  "/admin/users/:id",
  requirePermission(PERMISSIONS.PLATFORM_USER_MANAGE),
  validate(userIdParamSchema),
  deleteUser
);

export default adminUserRouter;
