import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/seo";

export const generateMeta = (data) =>
  handleRequest(() => API.post(`${BASE}/meta`, data));

export const generateSlug = (data) =>
  handleRequest(() => API.post(`${BASE}/slug`, data));

export const generateFAQ = (data) =>
  handleRequest(() => API.post(`${BASE}/faq`, data));

export const analyzeKeyword = (data) =>
  handleRequest(() => API.post(`${BASE}/keyword`, data));
