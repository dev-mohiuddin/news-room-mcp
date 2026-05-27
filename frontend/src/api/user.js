import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/user";

/* ── Profile ── */
export const getMyProfile = () =>
  handleRequest(() => API.get(`${BASE}/me`));

export const updateProfile = (data) =>
  handleRequest(() => API.patch(`${BASE}/profile`, data));

export const changePassword = (data) =>
  handleRequest(() => API.put(`${BASE}/password`, data));

export const updateNotifications = (data) =>
  handleRequest(() => API.patch(`${BASE}/notifications`, data));

export const updateWorkspace = (data) =>
  handleRequest(() => API.patch(`${BASE}/workspace`, data));

/* ── Personal API keys ── */
export const getApiKeys = () =>
  handleRequest(() => API.get(`${BASE}/api-keys`));

export const createApiKey = (data) =>
  handleRequest(() => API.post(`${BASE}/api-keys`, data));

export const deleteApiKey = (id) =>
  handleRequest(() => API.delete(`${BASE}/api-keys/${id}`));

/* ── Provider key overrides ── */
export const getProviderKeys = () =>
  handleRequest(() => API.get(`${BASE}/provider-keys`));

export const upsertProviderKey = (data) =>
  handleRequest(() => API.put(`${BASE}/provider-keys`, data));

export const deleteProviderKey = (provider) =>
  handleRequest(() => API.delete(`${BASE}/provider-keys/${provider}`));
