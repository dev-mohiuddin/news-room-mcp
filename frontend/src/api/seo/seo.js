import { API, handleRequest } from "@/lib/http";

export const generateMeta = (data) =>
  handleRequest(() => API.post(`/api/seo/meta`, data));

export const generateSlug = (data) =>
  handleRequest(() => API.post(`/api/seo/slug`, data));

export const generateFAQ = (data) =>
  handleRequest(() => API.post(`/api/seo/faq`, data));

export const analyzeKeyword = (data) =>
  handleRequest(() => API.post(`/api/seo/keyword`, data));
