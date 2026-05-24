import { API, handleRequest } from "@/lib/http";

export const loginApi = (data) =>
  handleRequest(() => API.post(`/api/auth/login`, data));

export const registerApi = (data) =>
  handleRequest(() => API.post(`/api/auth/register`, data));

export const logoutApi = () =>
  handleRequest(() => API.post(`/api/auth/logout`));

export const refreshTokenApi = () =>
  handleRequest(() => API.post(`/api/auth/refresh`));

export const forgotPasswordApi = (data) =>
  handleRequest(() => API.post(`/api/auth/forgot-password`, data));

export const resetPasswordApi = (token, data) =>
  handleRequest(() => API.post(`/api/auth/reset-password/${token}`, data));

export const meApi = () =>
  handleRequest(() => API.get(`/api/auth/me`));
