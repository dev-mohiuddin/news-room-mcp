import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/notifications";
const ADMIN_BASE = "/api/v1/admin/broadcasts";

/* ── Inbox (any authenticated user) ── */
export const listNotificationsApi = (params = {}) =>
  handleRequest(() => API.get(BASE, { params }));

export const getUnreadCountApi = () =>
  handleRequest(() => API.get(`${BASE}/unread-count`));

export const markNotificationReadApi = (id) =>
  handleRequest(() => API.patch(`${BASE}/${id}/read`));

export const markAllNotificationsReadApi = () =>
  handleRequest(() => API.post(`${BASE}/read-all`));

export const deleteNotificationApi = (id) =>
  handleRequest(() => API.delete(`${BASE}/${id}`));

export const clearReadNotificationsApi = () =>
  handleRequest(() => API.delete(`${BASE}/read`));

/* ── Admin broadcasts ── */
export const sendBroadcastApi = (data) =>
  handleRequest(() => API.post(ADMIN_BASE, data));

export const listBroadcastsApi = (params = {}) =>
  handleRequest(() => API.get(ADMIN_BASE, { params }));
