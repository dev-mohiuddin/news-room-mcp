import * as userService from "#services/user/userService.js";
import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";

/* GET /api/v1/admin/users */
export const listUsers = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["createdAt", "name", "email"],
  });
  const filters = {};
  if (req.query.scope) filters.scope = req.query.scope;
  if (req.query.isActive !== undefined) {
    filters.isActive = req.query.isActive === "true";
  }
  const { items, meta } = await userService.listUsers(params, filters);
  res.success({
    data: items,
    pagination: meta,
    message: "Users fetched",
  });
});

/* GET /api/v1/admin/users/:id */
export const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.success({ data: user, message: "User fetched" });
});

/* PATCH /api/v1/admin/users/:id/role */
export const changeRole = catchAsync(async (req, res) => {
  const user = await userService.changeUserRole({
    actor: req.user,
    userId: req.params.id,
    roleId: req.body.roleId,
    req,
  });
  res.success({ data: user, message: `Role updated for ${user.name}` });
});

/* PATCH /api/v1/admin/users/:id/status */
export const setStatus = catchAsync(async (req, res) => {
  const user = await userService.setUserActive({
    actor: req.user,
    userId: req.params.id,
    isActive: !!req.body.isActive,
    req,
  });
  res.success({
    data: user,
    message: `User ${req.body.isActive ? "activated" : "suspended"}`,
  });
});

/* DELETE /api/v1/admin/users/:id */
export const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUser({
    actor: req.user,
    userId: req.params.id,
    req,
  });
  res.success({ data: null, message: "User deleted" });
});
