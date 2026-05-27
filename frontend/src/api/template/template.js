import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/templates";

export const listTemplatesApi = (params) =>
  handleRequest(() => API.get(BASE, { params }));

export const getTemplateApi = (id) =>
  handleRequest(() => API.get(`${BASE}/${id}`));

export const createTemplateApi = (data) =>
  handleRequest(() => API.post(BASE, data));

export const updateTemplateApi = (id, data) =>
  handleRequest(() => API.patch(`${BASE}/${id}`, data));

export const deleteTemplateApi = (id) =>
  handleRequest(() => API.delete(`${BASE}/${id}`));

export const useTemplateApi = (id) =>
  handleRequest(() => API.post(`${BASE}/${id}/use`));
