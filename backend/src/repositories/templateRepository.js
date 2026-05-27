import { Template } from "#models/templateModel.js";
import { paginateModel } from "#utils/paginationUtil.js";

const requireScope = (workspaceId, fn) => {
  if (!workspaceId) {
    throw new Error(`templateRepository.${fn}: workspaceId is required`);
  }
};

export const listTemplates = (workspaceId, params) => {
  requireScope(workspaceId, "listTemplates");
  return paginateModel(
    Template,
    { workspaceId },
    params,
    {
      searchFields: ["name", "category"],
    }
  );
};

export const findTemplateById = (workspaceId, id) => {
  requireScope(workspaceId, "findTemplateById");
  return Template.findOne({ _id: id, workspaceId }).exec();
};

export const createTemplate = (workspaceId, data) => {
  requireScope(workspaceId, "createTemplate");
  return Template.create({ ...data, workspaceId });
};

export const updateTemplate = (workspaceId, id, data) => {
  requireScope(workspaceId, "updateTemplate");
  return Template.findOneAndUpdate(
    { _id: id, workspaceId },
    { $set: data },
    { new: true }
  ).exec();
};

export const deleteTemplate = (workspaceId, id) => {
  requireScope(workspaceId, "deleteTemplate");
  return Template.findOneAndDelete({ _id: id, workspaceId }).exec();
};

export const incrementTemplateUse = (workspaceId, id) => {
  requireScope(workspaceId, "incrementTemplateUse");
  return Template.findOneAndUpdate(
    { _id: id, workspaceId },
    { $inc: { uses: 1 }, $set: { lastUsedAt: new Date() } },
    { new: true }
  ).exec();
};
