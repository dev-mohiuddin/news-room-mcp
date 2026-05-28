import express from "express";

/* ── Admin: /admin/users (platform side) ── */
import {
  listUsers,
  getUser,
  changeRole,
  setStatus,
  deleteUser,
} from "#controllers/user/userController.js";

/* ── Tenant self-service: /user/* (profile, password, api keys) ── */
import {
  getMyProfileHandler,
  updateMyProfileHandler,
  changeMyPasswordHandler,
  updateMyNotificationsHandler,
  updateMyWorkspaceHandler,
} from "#controllers/user/profileController.js";
import {
  listApiKeysHandler,
  createApiKeyHandler,
  revokeApiKeyHandler,
  listProviderKeysHandler,
  upsertProviderKeyHandler,
  deleteProviderKeyHandler,
} from "#controllers/user/apiKeyController.js";

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
  changeRoleSchema,
  setStatusSchema,
  userIdParamSchema,
} from "#validations/user/userValidation.js";
import {
  updateProfileSchema,
  changePasswordSchema,
  updateNotificationsSchema,
  updateWorkspaceSchema,
} from "#validations/user/profileValidation.js";
import {
  createApiKeySchema,
  apiKeyIdParamSchema,
  upsertProviderKeySchema,
  providerParamSchema,
} from "#validations/user/apiKeyValidation.js";

/* ============================================================
 *  Platform admin user-management router (unchanged)
 *  Mounted under /api/v1/admin/users
 * ============================================================ */
export const adminUserRouter = express.Router();

adminUserRouter.use("/admin/users", protect);

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

/* ============================================================
 *  Tenant self-service router (NEW)
 *  Mounted under /api/v1/user/*
 *
 *  Every route below is gated by `protect + tenantScope`, so
 *  platform-only admins (no workspace) get a clean 403 instead
 *  of a stack trace.
 * ============================================================ */
export const userSelfRouter = express.Router();

userSelfRouter.use("/user", protect, tenantScope);

/* ── Profile ── */

userSelfRouter.get(
  "/user/me",
  createRateLimiter(240, 5),
  getMyProfileHandler
);

userSelfRouter.patch(
  "/user/profile",
  createStrictRateLimiter(30, 5),
  validate(updateProfileSchema),
  updateMyProfileHandler
);

userSelfRouter.put(
  "/user/password",
  createStrictRateLimiter(10, 15),
  validate(changePasswordSchema),
  changeMyPasswordHandler
);

userSelfRouter.patch(
  "/user/notifications",
  createStrictRateLimiter(30, 5),
  validate(updateNotificationsSchema),
  updateMyNotificationsHandler
);

userSelfRouter.patch(
  "/user/workspace",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_WORKSPACE_MANAGE),
  validate(updateWorkspaceSchema),
  updateMyWorkspaceHandler
);

/* ── Personal API keys ── */

userSelfRouter.get(
  "/user/api-keys",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_API_KEY_MANAGE),
  listApiKeysHandler
);

userSelfRouter.post(
  "/user/api-keys",
  createStrictRateLimiter(10, 15),
  requirePermission(PERMISSIONS.TENANT_API_KEY_MANAGE),
  validate(createApiKeySchema),
  createApiKeyHandler
);

userSelfRouter.delete(
  "/user/api-keys/:id",
  createStrictRateLimiter(20, 5),
  requirePermission(PERMISSIONS.TENANT_API_KEY_MANAGE),
  validate(apiKeyIdParamSchema),
  revokeApiKeyHandler
);

/* ── Provider key overrides ── */

userSelfRouter.get(
  "/user/provider-keys",
  createRateLimiter(120, 5),
  requirePermission(PERMISSIONS.TENANT_API_KEY_MANAGE),
  listProviderKeysHandler
);

userSelfRouter.put(
  "/user/provider-keys",
  createStrictRateLimiter(15, 5),
  requirePermission(PERMISSIONS.TENANT_API_KEY_MANAGE),
  validate(upsertProviderKeySchema),
  upsertProviderKeyHandler
);

userSelfRouter.delete(
  "/user/provider-keys/:provider",
  createStrictRateLimiter(15, 5),
  requirePermission(PERMISSIONS.TENANT_API_KEY_MANAGE),
  validate(providerParamSchema),
  deleteProviderKeyHandler
);

export default adminUserRouter;
