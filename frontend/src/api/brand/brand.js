import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/brand-voice";

export const listBrandVoicesApi = () =>
  handleRequest(() => API.get(BASE));

export const getBrandVoiceApi = (id) =>
  handleRequest(() => API.get(`${BASE}/${id}`));

export const createBrandVoiceApi = (payload) =>
  handleRequest(() => API.post(BASE, payload));

export const reExtractBrandVoiceApi = (id) =>
  handleRequest(() => API.post(`${BASE}/${id}/re-extract`));

export const activateBrandVoiceApi = (id) =>
  handleRequest(() => API.post(`${BASE}/${id}/activate`));

export const deleteBrandVoiceApi = (id) =>
  handleRequest(() => API.delete(`${BASE}/${id}`));
