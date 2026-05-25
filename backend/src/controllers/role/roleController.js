import * as roleService from "#services/role/roleService.js";
import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";

/**
 * GET /api/v1/admin/roles
 * Paginated role list with optional ?scope=platform|tenant&search=...
 */
export const listRoles = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["createdAt", "name", "displayName"],
  });
  const scope = req.query.scope;

  const { items, meta } = await roleService.listRolesPaginated(params, { scope });

  res.success({
    data: items,
    pagination: meta,
    message: "Roles fetched",
  });
});

/**
 * GET /api/v1/admin/roles/permissions
 * Returns the grouped permission catalog for the picker UI.
 * Optional ?scope=platform|tenant filter.
 */
export const getPermissions = catchAsync(async (req, res) => {
  const scope = req.query.scope;
  const catalog = roleService.getPermissionCatalog(scope);
  res.success({ data: catalog, message: "Permission catalog" });
});

/**
 * GET /api/v1/admin/roles/:id
 */
export const getRole = catchAsync(async (req, res) => {
  const role = await roleService.getRoleById(req.params.id);
  res.success({ data: role, message: "Role fetched" });
});

/**
 * POST /api/v1/admin/roles
 */
export const createRole = catchAsync(async (req, res) => {
  const role = await roleService.createRole({
    ...req.body,
    createdBy: req.user.id,
    actor: req.user,
    req,
  });
  res.success({
    data: role,
    message: `Role '${role.displayName}' created`,
    statusCode: 201,
  });
});

/**
 * PATCH /api/v1/admin/roles/:id
 */
export const updateRole = catchAsync(async (req, res) => {
  const role = await roleService.updateRole(req.params.id, req.body, {
    actor: req.user,
    req,
  });
  res.success({ data: role, message: `Role '${role.displayName}' updated` });
});

/**
 * DELETE /api/v1/admin/roles/:id
 */
export const deleteRole = catchAsync(async (req, res) => {
  await roleService.deleteRole(req.params.id, { actor: req.user, req });
  res.success({ data: null, message: "Role deleted" });
});
