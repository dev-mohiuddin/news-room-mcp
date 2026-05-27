import { API, handleRequest } from "@/lib/http";

const TENANT_BASE = "/api/v1/support";
const ADMIN_BASE = "/api/v1/admin/support";

/* ── Tenant ── */
export const listMyTicketsApi = (params = {}) =>
  handleRequest(() => API.get(`${TENANT_BASE}/tickets`, { params }));

export const getMyTicketStatsApi = () =>
  handleRequest(() => API.get(`${TENANT_BASE}/tickets/stats`));

export const getMyTicketApi = (id) =>
  handleRequest(() => API.get(`${TENANT_BASE}/tickets/${id}`));

export const createTicketApi = (data) =>
  handleRequest(() => API.post(`${TENANT_BASE}/tickets`, data));

export const replyToMyTicketApi = (id, data) =>
  handleRequest(() => API.post(`${TENANT_BASE}/tickets/${id}/reply`, data));

export const tenantChangeStatusApi = (id, status) =>
  handleRequest(() =>
    API.patch(`${TENANT_BASE}/tickets/${id}/status`, { status })
  );

/* ── Admin ── */
export const listAdminTicketsApi = (params = {}) =>
  handleRequest(() => API.get(`${ADMIN_BASE}/tickets`, { params }));

export const getAdminTicketStatsApi = () =>
  handleRequest(() => API.get(`${ADMIN_BASE}/stats`));

export const getAdminTicketApi = (id) =>
  handleRequest(() => API.get(`${ADMIN_BASE}/tickets/${id}`));

export const replyAsStaffApi = (id, data) =>
  handleRequest(() => API.post(`${ADMIN_BASE}/tickets/${id}/reply`, data));

export const adminChangeStatusApi = (id, status) =>
  handleRequest(() =>
    API.patch(`${ADMIN_BASE}/tickets/${id}/status`, { status })
  );

export const adminChangePriorityApi = (id, priority) =>
  handleRequest(() =>
    API.patch(`${ADMIN_BASE}/tickets/${id}/priority`, { priority })
  );

export const adminAssignApi = (id, assigneeId) =>
  handleRequest(() =>
    API.patch(`${ADMIN_BASE}/tickets/${id}/assign`, {
      assigneeId: assigneeId || null,
    })
  );
