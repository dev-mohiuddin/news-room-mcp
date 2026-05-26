import { BrandVoiceProfile } from "#models/brandVoiceProfileModel.js";
import { MissingTenantScopeError } from "#utils/pipelineErrors.js";

const requireScope = (workspaceId, method) => {
  if (!workspaceId) throw new MissingTenantScopeError(method);
};

export const listProfiles = (workspaceId) => {
  requireScope(workspaceId, "listProfiles");
  return BrandVoiceProfile.find({ workspaceId })
    .sort({ isActive: -1, updatedAt: -1 })
    .exec();
};

export const findActiveProfile = (workspaceId) => {
  requireScope(workspaceId, "findActiveProfile");
  return BrandVoiceProfile.findOne({ workspaceId, isActive: true }).exec();
};

export const findProfileById = (workspaceId, id) => {
  requireScope(workspaceId, "findProfileById");
  return BrandVoiceProfile.findOne({ _id: id, workspaceId }).exec();
};

export const createProfile = (workspaceId, payload) => {
  requireScope(workspaceId, "createProfile");
  return BrandVoiceProfile.create({ ...payload, workspaceId });
};

export const updateProfile = (workspaceId, id, set) => {
  requireScope(workspaceId, "updateProfile");
  return BrandVoiceProfile.findOneAndUpdate(
    { _id: id, workspaceId },
    { $set: set },
    { new: true }
  ).exec();
};

export const deleteProfile = (workspaceId, id) => {
  requireScope(workspaceId, "deleteProfile");
  return BrandVoiceProfile.findOneAndDelete({ _id: id, workspaceId }).exec();
};

/**
 * Atomic "set as active" — clears isActive on all other profiles in the
 * same workspace, then sets it on the target. Wrapped in a transaction
 * so the unique partial index is never violated.
 */
export const setActiveProfile = async (workspaceId, id) => {
  requireScope(workspaceId, "setActiveProfile");
  await BrandVoiceProfile.updateMany(
    { workspaceId, _id: { $ne: id } },
    { $set: { isActive: false } }
  ).exec();
  return BrandVoiceProfile.findOneAndUpdate(
    { _id: id, workspaceId },
    { $set: { isActive: true } },
    { new: true }
  ).exec();
};
