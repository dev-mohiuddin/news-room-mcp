import { AuditLog } from "#models/auditLogModel.js";

export const createAuditLog = async (data) => {
  return AuditLog.create(data);
};

export const getAuditLogs = async (query = {}, skip = 0, limit = 50) => {
  return AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
};
