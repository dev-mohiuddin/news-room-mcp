import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/admin/users";

export const listUsersApi = (params) =>
  handleRequest(() => API.get(BASE, { params }));

export const getUserApi = (id) =>
  handleRequest(() => API.get(`${BASE}/${id}`));

export const changeUserRoleApi = (id, roleId) =>
  handleRequest(() => API.patch(`${BASE}/${id}/role`, { roleId }));

export const setUserStatusApi = (id, isActive) =>
  handleRequest(() => API.patch(`${BASE}/${id}/status`, { isActive }));

export const deleteUserApi = (id) =>
  handleRequest(() => API.delete(`${BASE}/${id}`));
