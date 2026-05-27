import { ApiKey } from "#models/apiKeyModel.js";

const requireScope = (workspaceId, fn) => {
  if (!workspaceId) {
    throw new Error(`apiKeyRepository.${fn}: workspaceId is required`);
  }
};

export const listApiKeys = (workspaceId) => {
  requireScope(workspaceId, "listApiKeys");
  return ApiKey.find({ workspaceId, revokedAt: null })
    .sort({ createdAt: -1 })
    .exec();
};

export const findApiKeyById = (workspaceId, id) => {
  requireScope(workspaceId, "findApiKeyById");
  return ApiKey.findOne({ _id: id, workspaceId }).exec();
};

export const createApiKey = (workspaceId, data) => {
  requireScope(workspaceId, "createApiKey");
  return ApiKey.create({ ...data, workspaceId });
};

export const revokeApiKey = (workspaceId, id) => {
  requireScope(workspaceId, "revokeApiKey");
  return ApiKey.findOneAndUpdate(
    { _id: id, workspaceId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { new: true }
  ).exec();
};

/**
 * Lookup by hash for the (future) auth middleware that authenticates
 * incoming requests bearing an `nrm_live_*` key. Returns the active
 * key record only — revoked keys are excluded.
 */
export const findActiveApiKeyByHash = (keyHash) =>
  ApiKey.findOne({ keyHash, revokedAt: null })
    .select("+keyHash")
    .exec();

export const touchApiKeyLastUsed = (id) =>
  ApiKey.findByIdAndUpdate(id, { $set: { lastUsedAt: new Date() } }).exec();
