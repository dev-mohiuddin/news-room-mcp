import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/admin/roles";

export const listRolesApi = (params) =>
  handleRequest(() => API.get(BASE, { params }));

export const getRoleApi = (id) =>
  handleRequest(() => API.get(`${BASE}/${id}`));

export const getPermissionCatalogApi = (scope) =>
  handleRequest(() =>
    API.get(`${BASE}/permissions`, { params: scope ? { scope } : {} })
  );

export const createRoleApi = (data) =>
  handleRequest(() => API.post(BASE, data));

export const updateRoleApi = (id, data) =>
  handleRequest(() => API.patch(`${BASE}/${id}`, data));

export const deleteRoleApi = (id) =>
  handleRequest(() => API.delete(`${BASE}/${id}`));
