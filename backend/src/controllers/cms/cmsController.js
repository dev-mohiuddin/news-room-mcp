import { catchAsync } from "#utils/catchAsync.js";
import * as cmsService from "#services/cms/cmsConnectionService.js";

/* GET /api/v1/cms/connections */
export const listConnections = catchAsync(async (req, res) => {
  const items = await cmsService.listConnections(req.tenant.workspaceId);
  res.success({ data: items, message: "CMS connections" });
});

/* GET /api/v1/cms/connections/:id */
export const getConnection = catchAsync(async (req, res) => {
  const conn = await cmsService.getConnection(
    req.tenant.workspaceId,
    req.params.id
  );
  res.success({ data: conn, message: "CMS connection" });
});

/* POST /api/v1/cms/connections (WordPress) */
export const createWordpress = catchAsync(async (req, res) => {
  const conn = await cmsService.createWordpressConnection({
    workspaceId: req.tenant.workspaceId,
    actor: req.user,
    siteUrl: req.body.siteUrl,
    username: req.body.username,
    applicationPassword: req.body.applicationPassword,
    label: req.body.label,
    req,
  });
  res.success({
    data: conn,
    message: "WordPress site connected",
    statusCode: 201,
  });
});

/* POST /api/v1/cms/connections/:id/test */
export const testConnection = catchAsync(async (req, res) => {
  const conn = await cmsService.testConnection(
    req.tenant.workspaceId,
    req.params.id
  );
  res.success({ data: conn, message: "Connection verified" });
});

/* DELETE /api/v1/cms/connections/:id */
export const deleteConnection = catchAsync(async (req, res) => {
  await cmsService.removeConnection({
    workspaceId: req.tenant.workspaceId,
    id: req.params.id,
    actor: req.user,
    req,
  });
  res.status(204).end();
});
