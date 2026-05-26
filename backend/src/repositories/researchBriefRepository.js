import { ResearchBrief } from "#models/researchBriefModel.js";
import { MissingTenantScopeError } from "#utils/pipelineErrors.js";

const requireScope = (workspaceId, method) => {
  if (!workspaceId) throw new MissingTenantScopeError(method);
};

export const findBriefById = (workspaceId, id) => {
  requireScope(workspaceId, "findBriefById");
  return ResearchBrief.findOne({ _id: id, workspaceId }).exec();
};

export const findBriefByArticleId = (workspaceId, articleId) => {
  requireScope(workspaceId, "findBriefByArticleId");
  return ResearchBrief.findOne({ articleId, workspaceId }).exec();
};

export const upsertBriefForArticle = async (workspaceId, articleId, payload) => {
  requireScope(workspaceId, "upsertBriefForArticle");
  return ResearchBrief.findOneAndUpdate(
    { articleId, workspaceId },
    { $set: { ...payload, articleId, workspaceId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();
};

export const findExistingByContentHash = (workspaceId, contentHash) => {
  requireScope(workspaceId, "findExistingByContentHash");
  return ResearchBrief.findOne({
    workspaceId,
    "sources.contentHash": contentHash,
  }).exec();
};
