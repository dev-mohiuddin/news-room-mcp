import express from "express";
import {
  listConnections,
  getConnection,
  createWordpress,
  testConnection,
  deleteConnection,
} from "#controllers/cms/cmsController.js";
import { protect } from "#middlewares/authMiddleware.js";
import { tenantScope } from "#middlewares/tenantScopeMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createWordpressConnectionSchema,
  cmsIdParamSchema,
} from "#validations/cms/cmsValidation.js";
import { PERMISSIONS } from "#constants/roles.js";

export const cmsRouter = express.Router();

cmsRouter.use("/cms", protect, tenantScope);

cmsRouter.get(
  "/cms/connections",
  requirePermission(PERMISSIONS.TENANT_CMS_MANAGE),
  listConnections
);
cmsRouter.get(
  "/cms/connections/:id",
  requirePermission(PERMISSIONS.TENANT_CMS_MANAGE),
  validate(cmsIdParamSchema),
  getConnection
);
cmsRouter.post(
  "/cms/connections",
  requirePermission(PERMISSIONS.TENANT_CMS_MANAGE),
  validate(createWordpressConnectionSchema),
  createWordpress
);
cmsRouter.post(
  "/cms/connections/:id/test",
  requirePermission(PERMISSIONS.TENANT_CMS_MANAGE),
  validate(cmsIdParamSchema),
  testConnection
);
cmsRouter.delete(
  "/cms/connections/:id",
  requirePermission(PERMISSIONS.TENANT_CMS_MANAGE),
  validate(cmsIdParamSchema),
  deleteConnection
);

export default cmsRouter;
