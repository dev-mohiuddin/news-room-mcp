import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/cms/connections";

export const listCmsConnectionsApi = () =>
  handleRequest(() => API.get(BASE));

export const getCmsConnectionApi = (id) =>
  handleRequest(() => API.get(`${BASE}/${id}`));

export const createWordpressConnectionApi = (payload) =>
  handleRequest(() => API.post(BASE, payload));

export const testCmsConnectionApi = (id) =>
  handleRequest(() => API.post(`${BASE}/${id}/test`));

export const deleteCmsConnectionApi = (id) =>
  handleRequest(() => API.delete(`${BASE}/${id}`));
