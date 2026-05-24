import { API, handleRequest } from "@/lib/http";

export const searchTopic = (data) =>
  handleRequest(() => API.post(`/api/research/search`, data));

export const summarizeSources = (data) =>
  handleRequest(() => API.post(`/api/research/summarize`, data));

export const generateBrief = (data) =>
  handleRequest(() => API.post(`/api/research/brief`, data));
