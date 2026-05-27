import { API, handleRequest } from "@/lib/http";

const PUBLIC_BASE = "/api/v1/plans";
const ADMIN_BASE = "/api/v1/admin/plans";

/* ── Public ── */
export const listPublicPlansApi = () =>
  handleRequest(() => API.get(PUBLIC_BASE));

/* ── Admin CRUD ── */
export const listAdminPlansApi = (params = {}) =>
  handleRequest(() => API.get(ADMIN_BASE, { params }));

export const getAdminPlanApi = (id) =>
  handleRequest(() => API.get(`${ADMIN_BASE}/${id}`));

export const createPlanApi = (data) =>
  handleRequest(() => API.post(ADMIN_BASE, data));

export const updatePlanApi = (id, data) =>
  handleRequest(() => API.patch(`${ADMIN_BASE}/${id}`, data));

export const setPlanActiveApi = (id, isActive) =>
  handleRequest(() => API.patch(`${ADMIN_BASE}/${id}/active`, { isActive }));

export const deletePlanApi = (id) =>
  handleRequest(() => API.delete(`${ADMIN_BASE}/${id}`));
