import { ProviderKey } from "#models/providerKeyModel.js";

const requireScope = (workspaceId, fn) => {
  if (!workspaceId) {
    throw new Error(`providerKeyRepository.${fn}: workspaceId is required`);
  }
};

export const listProviderKeys = (workspaceId) => {
  requireScope(workspaceId, "listProviderKeys");
  return ProviderKey.find({ workspaceId }).sort({ provider: 1 }).exec();
};

export const findProviderKey = (workspaceId, provider) => {
  requireScope(workspaceId, "findProviderKey");
  return ProviderKey.findOne({ workspaceId, provider }).exec();
};

/**
 * For internal use by services that want to consume the encrypted key.
 * Returns the document WITH `encryptedKey` populated.
 */
export const findProviderKeyWithSecret = (workspaceId, provider) => {
  requireScope(workspaceId, "findProviderKeyWithSecret");
  return ProviderKey.findOne({ workspaceId, provider })
    .select("+encryptedKey")
    .exec();
};

export const upsertProviderKey = (workspaceId, provider, data) => {
  requireScope(workspaceId, "upsertProviderKey");
  return ProviderKey.findOneAndUpdate(
    { workspaceId, provider },
    { $set: { ...data, workspaceId, provider } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();
};

export const deleteProviderKey = (workspaceId, provider) => {
  requireScope(workspaceId, "deleteProviderKey");
  return ProviderKey.findOneAndDelete({ workspaceId, provider }).exec();
};
