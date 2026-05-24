import { API, handleRequest } from "@/lib/http";

export const getBrandVoices = (query = "") =>
  handleRequest(() => API.get(`/api/brand-voices${query}`));

export const getSingleBrandVoice = (id) =>
  handleRequest(() => API.get(`/api/brand-voices/${id}`));

export const createBrandVoice = (data) =>
  handleRequest(() => API.post(`/api/brand-voices`, data));

export const updateBrandVoice = (id, data) =>
  handleRequest(() => API.put(`/api/brand-voices/${id}`, data));

export const deleteBrandVoice = (id) =>
  handleRequest(() => API.delete(`/api/brand-voices/${id}`));
