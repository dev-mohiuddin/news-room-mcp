import { API, handleRequest } from "@/lib/http";

export const getCmsConnections = (query = "") =>
  handleRequest(() => API.get(`/api/cms/connections${query}`));

export const addCmsConnection = (data) =>
  handleRequest(() => API.post(`/api/cms/connections`, data));

export const testCmsConnection = (id) =>
  handleRequest(() => API.post(`/api/cms/connections/${id}/test`));

export const deleteCmsConnection = (id) =>
  handleRequest(() => API.delete(`/api/cms/connections/${id}`));
