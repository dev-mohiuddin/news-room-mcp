import { API, handleRequest } from "@/lib/http";

export const getAllArticles = (query = "") =>
  handleRequest(() => API.get(`/api/articles${query}`));

export const getSingleArticle = (id) =>
  handleRequest(() => API.get(`/api/articles/${id}`));

export const createArticle = (data) =>
  handleRequest(() => API.post(`/api/articles`, data));

export const updateArticle = (id, data) =>
  handleRequest(() => API.put(`/api/articles/${id}`, data));

export const deleteArticle = (id) =>
  handleRequest(() => API.delete(`/api/articles/${id}`));

export const publishArticle = (id, data) =>
  handleRequest(() => API.post(`/api/articles/${id}/publish`, data));

export const articleStatistics = () =>
  handleRequest(() => API.get(`/api/articles/statistics`));
