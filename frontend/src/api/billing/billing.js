import { API, handleRequest } from "@/lib/http";

export const getPlans = () =>
  handleRequest(() => API.get(`/api/billing/plans`));

export const getSubscription = () =>
  handleRequest(() => API.get(`/api/billing/subscription`));

export const createCheckout = (data) =>
  handleRequest(() => API.post(`/api/billing/checkout`, data));

export const cancelSubscription = () =>
  handleRequest(() => API.post(`/api/billing/cancel`));

export const getInvoices = (query = "") =>
  handleRequest(() => API.get(`/api/billing/invoices${query}`));
