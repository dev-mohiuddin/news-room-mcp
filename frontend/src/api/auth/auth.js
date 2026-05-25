import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/auth";

export const loginApi = (data) => handleRequest(() => API.post(`${BASE}/login`, data));

export const registerApi = (data) =>
  handleRequest(() => API.post(`${BASE}/register`, data));

export const verifyOtpApi = (data) =>
  handleRequest(() => API.post(`${BASE}/verify-otp`, data));

export const resendOtpApi = (data) =>
  handleRequest(() => API.post(`${BASE}/resend-otp`, data));

export const googleSignInApi = (data) =>
  handleRequest(() => API.post(`${BASE}/google`, data));

export const logoutApi = () => handleRequest(() => API.post(`${BASE}/logout`));

export const refreshTokenApi = () =>
  handleRequest(() => API.post(`${BASE}/refresh-token`));

export const forgotPasswordApi = (data) =>
  handleRequest(() => API.post(`${BASE}/forgot-password`, data));

export const resetPasswordApi = (token, data) =>
  handleRequest(() => API.post(`${BASE}/reset-password/${token}`, data));

export const meApi = () => handleRequest(() => API.get(`${BASE}/me`));
