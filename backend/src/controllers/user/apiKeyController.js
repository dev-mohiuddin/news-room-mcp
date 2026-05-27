import * as apiKeyService from "#services/user/apiKeyService.js";
import * as providerKeyService from "#services/user/providerKeyService.js";
import { catchAsync } from "#utils/catchAsync.js";

/* GET /api/v1/user/api-keys */
export const listApiKeysHandler = catchAsync(async (req, res) => {
  const data = await apiKeyService.listApiKeys(req.tenant.workspaceId);
  res.success({ data, message: "API keys" });
});

/* POST /api/v1/user/api-keys */
export const createApiKeyHandler = catchAsync(async (req, res) => {
  const data = await apiKeyService.createApiKey({
    workspaceId: req.tenant.workspaceId,
    userId: req.user.id,
    name: req.body?.name,
    scope: req.body?.scope,
    req,
  });
  res.success({
    data,
    message:
      "API key created. Copy the secret now — we won't show it again.",
    statusCode: 201,
  });
});

/* DELETE /api/v1/user/api-keys/:id */
export const revokeApiKeyHandler = catchAsync(async (req, res) => {
  await apiKeyService.revokeApiKey({
    workspaceId: req.tenant.workspaceId,
    userId: req.user.id,
    id: req.params.id,
    req,
  });
  res.success({ data: null, message: "API key revoked" });
});

/* GET /api/v1/user/provider-keys */
export const listProviderKeysHandler = catchAsync(async (req, res) => {
  const data = await providerKeyService.listProviderKeys(
    req.tenant.workspaceId
  );
  res.success({ data, message: "Provider keys" });
});

/* PUT /api/v1/user/provider-keys */
export const upsertProviderKeyHandler = catchAsync(async (req, res) => {
  const data = await providerKeyService.upsertProviderKey({
    workspaceId: req.tenant.workspaceId,
    userId: req.user.id,
    provider: req.body.provider,
    rawKey: req.body.rawKey,
    label: req.body.label,
    req,
  });
  res.success({ data, message: "Provider key saved" });
});

/* DELETE /api/v1/user/provider-keys/:provider */
export const deleteProviderKeyHandler = catchAsync(async (req, res) => {
  const data = await providerKeyService.deleteProviderKey({
    workspaceId: req.tenant.workspaceId,
    userId: req.user.id,
    provider: req.params.provider,
    req,
  });
  res.success({ data, message: "Provider key removed" });
});
