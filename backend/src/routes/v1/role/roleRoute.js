import express from "express";

import {
  listRoles,
  getPermissions,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} from "#controllers/role/roleController.js";

import { protect } from "#middlewares/authMiddleware.js";
import {
  requirePermission,
  requireSuperAdmin,
} from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";

import {
  createRoleSchema,
  updateRoleSchema,
  deleteRoleSchema,
} from "#validations/role/roleValidation.js";

import { PERMISSIONS } from "#constants/roles.js";

export const roleRouter = express.Router();

/**
 * All role routes require an authenticated user with the
 * `platform.role:manage` permission OR super_admin (wildcard).
 *
 * Mount path: /api/v1/admin/roles
 */
roleRouter.use(protect, requirePermission(PERMISSIONS.PLATFORM_ROLE_MANAGE));

/* ── Read ── */
roleRouter.get("/admin/roles", listRoles);
roleRouter.get("/admin/roles/permissions", getPermissions);
roleRouter.get("/admin/roles/:id", getRole);

/* ── Write — super_admin only (wildcard owner) ── */
roleRouter.post(
  "/admin/roles",
  requireSuperAdmin(),
  validate(createRoleSchema),
  createRole
);
roleRouter.patch(
  "/admin/roles/:id",
  requireSuperAdmin(),
  validate(updateRoleSchema),
  updateRole
);
roleRouter.delete(
  "/admin/roles/:id",
  requireSuperAdmin(),
  validate(deleteRoleSchema),
  deleteRole
);

export default roleRouter;
