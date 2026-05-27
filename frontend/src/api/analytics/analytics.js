import { API, handleRequest } from "@/lib/http";

const TRACK = "/api/v1/track/view";
const TENANT_BASE = "/api/v1/analytics";
const ADMIN_BASE = "/api/v1/admin/analytics";

/* ── Public — view tracking pixel/beacon ── */
export const trackArticleViewApi = (data) =>
  handleRequest(() => API.post(TRACK, data));

/* ── Tenant ── */
export const getTenantDashboardApi = () =>
  handleRequest(() => API.get(`${TENANT_BASE}/dashboard`));

export const getTenantReportApi = (range = "30d") =>
  handleRequest(() => API.get(`${TENANT_BASE}/report`, { params: { range } }));

/* ── Admin ── */
export const getAdminDashboardApi = () =>
  handleRequest(() => API.get(`${ADMIN_BASE}/dashboard`));

export const getAdminReportApi = (range = "30d") =>
  handleRequest(() => API.get(`${ADMIN_BASE}/report`, { params: { range } }));
