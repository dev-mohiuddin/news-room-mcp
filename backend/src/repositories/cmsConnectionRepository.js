import { CmsConnection } from "#models/cmsConnectionModel.js";
import { MissingTenantScopeError } from "#utils/pipelineErrors.js";

const requireScope = (workspaceId, method) => {
  if (!workspaceId) throw new MissingTenantScopeError(method);
};

const PUBLIC_PROJECTION =
  "_id workspaceId provider siteUrl username label isDefault lastTestedAt createdAt updatedAt";

/* ── Reads (never include passwordEncrypted) ──────────────── */

export const findConnectionById = (workspaceId, id) => {
  requireScope(workspaceId, "findConnectionById");
  return CmsConnection.findOne({ _id: id, workspaceId })
    .select(PUBLIC_PROJECTION)
    .exec();
};

export const findConnectionByIdWithSecret = (workspaceId, id) => {
  requireScope(workspaceId, "findConnectionByIdWithSecret");
  return CmsConnection.findOne({ _id: id, workspaceId })
    .select(`${PUBLIC_PROJECTION} +passwordEncrypted`)
    .exec();
};

export const listConnectionsForWorkspace = (workspaceId) => {
  requireScope(workspaceId, "listConnectionsForWorkspace");
  return CmsConnection.find({ workspaceId })
    .select(PUBLIC_PROJECTION)
    .sort({ isDefault: -1, createdAt: -1 })
    .exec();
};

export const countConnectionsForWorkspace = (workspaceId) => {
  requireScope(workspaceId, "countConnectionsForWorkspace");
  return CmsConnection.countDocuments({ workspaceId });
};

/* ── Writes ───────────────────────────────────────────────── */

export const createConnection = (workspaceId, payload) => {
  requireScope(workspaceId, "createConnection");
  return CmsConnection.create({ ...payload, workspaceId });
};

export const updateConnection = (workspaceId, id, set) => {
  requireScope(workspaceId, "updateConnection");
  return CmsConnection.findOneAndUpdate(
    { _id: id, workspaceId },
    { $set: set },
    { new: true }
  )
    .select(PUBLIC_PROJECTION)
    .exec();
};

export const deleteConnection = (workspaceId, id) => {
  requireScope(workspaceId, "deleteConnection");
  return CmsConnection.findOneAndDelete({ _id: id, workspaceId }).exec();
};

export const touchLastTestedAt = (workspaceId, id) => {
  requireScope(workspaceId, "touchLastTestedAt");
  return CmsConnection.findOneAndUpdate(
    { _id: id, workspaceId },
    { $set: { lastTestedAt: new Date() } },
    { new: true }
  )
    .select(PUBLIC_PROJECTION)
    .exec();
};
