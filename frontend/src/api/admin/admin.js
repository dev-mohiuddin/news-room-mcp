import { API, handleRequest } from "@/lib/http";

/* ── Users ── */
export const getAllUsers = (query = "") =>
  handleRequest(() => API.get(`/api/admin/users${query}`));

export const getUserDetail = (id) =>
  handleRequest(() => API.get(`/api/admin/users/${id}`));

export const updateUserStatus = (id, data) =>
  handleRequest(() => API.put(`/api/admin/users/${id}/status`, data));

/* ── Plans ── */
export const getAdminPlans = () =>
  handleRequest(() => API.get(`/api/admin/plans`));

export const updateAdminPlan = (id, data) =>
  handleRequest(() => API.put(`/api/admin/plans/${id}`, data));

/* ── Analytics ── */
export const getAdminAnalytics = (query = "") =>
  handleRequest(() => API.get(`/api/admin/analytics${query}`));

export const getRevenueStats = (query = "") =>
  handleRequest(() => API.get(`/api/admin/analytics/revenue${query}`));

/* ── Audit logs ── */
export const getAuditLogs = (query = "") =>
  handleRequest(() => API.get(`/api/admin/logs${query}`));

/* ── Notifications ── */
export const sendBroadcast = (data) =>
  handleRequest(() => API.post(`/api/admin/notifications`, data));
