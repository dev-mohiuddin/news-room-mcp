import * as repo from "#repositories/templateRepository.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";

const sanitize = (template) => {
  if (!template) return null;
  const obj = template.toObject ? template.toObject() : template;
  return {
    id: obj._id?.toString(),
    name: obj.name,
    description: obj.description || "",
    category: obj.category || "General",
    targetWordCount: obj.targetWordCount || 1500,
    tonePreset: obj.tonePreset || null,
    additionalKeywords: Array.isArray(obj.additionalKeywords)
      ? obj.additionalKeywords
      : [],
    outlinePreset: Array.isArray(obj.outlinePreset) ? obj.outlinePreset : [],
    brandVoiceProfileId: obj.brandVoiceProfileId
      ? obj.brandVoiceProfileId.toString()
      : null,
    uses: obj.uses || 0,
    lastUsedAt: obj.lastUsedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

export const listTemplates = async (workspaceId, params) => {
  const { items, meta } = await repo.listTemplates(workspaceId, params);
  return { items: items.map(sanitize), meta };
};

export const getTemplate = async (workspaceId, id) => {
  const t = await repo.findTemplateById(workspaceId, id);
  if (!t) throwError("Template not found", 404);
  return sanitize(t);
};

export const createTemplate = async ({ workspaceId, userId, payload, req }) => {
  const t = await repo.createTemplate(workspaceId, {
    ...payload,
    createdBy: userId,
  });
  await logAudit({
    actorId: userId,
    category: "content",
    action: "template.created",
    entityType: "template",
    entityId: t._id,
    workspaceId,
    after: { name: t.name, category: t.category },
    req,
  });
  return sanitize(t);
};

export const updateTemplate = async ({ workspaceId, userId, id, payload, req }) => {
  const before = await repo.findTemplateById(workspaceId, id);
  if (!before) throwError("Template not found", 404);

  const updated = await repo.updateTemplate(workspaceId, id, payload);
  await logAudit({
    actorId: userId,
    category: "content",
    action: "template.updated",
    entityType: "template",
    entityId: id,
    workspaceId,
    before: { name: before.name, category: before.category },
    after: { name: updated.name, category: updated.category },
    req,
  });
  return sanitize(updated);
};

export const deleteTemplate = async ({ workspaceId, userId, id, req }) => {
  const removed = await repo.deleteTemplate(workspaceId, id);
  if (!removed) throwError("Template not found", 404);
  await logAudit({
    actorId: userId,
    category: "content",
    action: "template.deleted",
    entityType: "template",
    entityId: id,
    workspaceId,
    before: { name: removed.name },
    req,
  });
  return { deleted: true };
};

export const useTemplate = async ({ workspaceId, id }) => {
  const updated = await repo.incrementTemplateUse(workspaceId, id);
  if (!updated) throwError("Template not found", 404);
  return sanitize(updated);
};
