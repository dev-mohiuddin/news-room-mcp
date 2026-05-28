import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/admin/integrations";

export const listIntegrationsApi = () =>
  handleRequest(() => API.get(BASE));

export const upsertIntegrationApi = (data) =>
  handleRequest(() => API.put(BASE, data));

export const setIntegrationActiveApi = (provider, isActive) =>
  handleRequest(() => API.patch(`${BASE}/${provider}/active`, { isActive }));

export const deleteIntegrationApi = (provider) =>
  handleRequest(() => API.delete(`${BASE}/${provider}`));

export const testIntegrationApi = (provider) =>
  handleRequest(() => API.post(`${BASE}/${provider}/test`));
