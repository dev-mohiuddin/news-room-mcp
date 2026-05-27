import * as templateService from "#services/article/templateService.js";
import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";

/* GET /api/v1/templates */
export const listTemplatesHandler = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    allowedSortFields: ["createdAt", "name", "uses", "lastUsedAt"],
    allowedFilters: ["category"],
  });
  const { items, meta } = await templateService.listTemplates(
    req.tenant.workspaceId,
    params
  );
  res.success({
    data: items,
    pagination: meta,
    message: "Templates",
  });
});

/* GET /api/v1/templates/:id */
export const getTemplateHandler = catchAsync(async (req, res) => {
  const data = await templateService.getTemplate(
    req.tenant.workspaceId,
    req.params.id
  );
  res.success({ data, message: "Template" });
});

/* POST /api/v1/templates */
export const createTemplateHandler = catchAsync(async (req, res) => {
  const data = await templateService.createTemplate({
    workspaceId: req.tenant.workspaceId,
    userId: req.user.id,
    payload: req.body,
    req,
  });
  res.success({
    data,
    message: "Template created",
    statusCode: 201,
  });
});

/* PATCH /api/v1/templates/:id */
export const updateTemplateHandler = catchAsync(async (req, res) => {
  const data = await templateService.updateTemplate({
    workspaceId: req.tenant.workspaceId,
    userId: req.user.id,
    id: req.params.id,
    payload: req.body,
    req,
  });
  res.success({ data, message: "Template updated" });
});

/* DELETE /api/v1/templates/:id */
export const deleteTemplateHandler = catchAsync(async (req, res) => {
  await templateService.deleteTemplate({
    workspaceId: req.tenant.workspaceId,
    userId: req.user.id,
    id: req.params.id,
    req,
  });
  res.success({ data: null, message: "Template deleted" });
});

/* POST /api/v1/templates/:id/use — increment usage counter */
export const useTemplateHandler = catchAsync(async (req, res) => {
  const data = await templateService.useTemplate({
    workspaceId: req.tenant.workspaceId,
    id: req.params.id,
  });
  res.success({ data, message: "Template applied" });
});
