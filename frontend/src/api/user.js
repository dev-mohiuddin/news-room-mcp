import { API, handleRequest } from "@/lib/http";

export const updateProfile = (data) =>
  handleRequest(() => API.put(`/api/user/profile`, data));

export const changePassword = (data) =>
  handleRequest(() => API.put(`/api/user/password`, data));

export const getApiKeys = () =>
  handleRequest(() => API.get(`/api/user/api-keys`));

export const createApiKey = (data) =>
  handleRequest(() => API.post(`/api/user/api-keys`, data));

export const deleteApiKey = (id) =>
  handleRequest(() => API.delete(`/api/user/api-keys/${id}`));
