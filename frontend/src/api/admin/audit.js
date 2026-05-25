import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/admin/audit-logs";

export const listAuditLogsApi = (params) =>
  handleRequest(() => API.get(BASE, { params }));
