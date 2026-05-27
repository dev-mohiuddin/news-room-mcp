import { API, handleRequest } from "@/lib/http";

const TENANT_BASE = "/api/v1/billing";
const ADMIN_BASE = "/api/v1/admin/billing";

/* ── Tenant ── */
export const getMySubscriptionApi = () =>
  handleRequest(() => API.get(`${TENANT_BASE}/subscription`));

export const listMyInvoicesApi = (params = {}) =>
  handleRequest(() => API.get(`${TENANT_BASE}/invoices`, { params }));

export const createCheckoutSessionApi = (data) =>
  handleRequest(() => API.post(`${TENANT_BASE}/checkout`, data));

export const createPortalSessionApi = () =>
  handleRequest(() => API.post(`${TENANT_BASE}/portal`));

/* ── Admin ── */
export const getAdminBillingSummaryApi = () =>
  handleRequest(() => API.get(`${ADMIN_BASE}/summary`));

export const listAdminInvoicesApi = (params = {}) =>
  handleRequest(() => API.get(`${ADMIN_BASE}/invoices`, { params }));
