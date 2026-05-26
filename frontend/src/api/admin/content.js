import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/admin/articles";

export const listAdminArticlesApi = (params) =>
  handleRequest(() => API.get(BASE, { params }));

export const setArticleHiddenApi = (id, hidden) =>
  handleRequest(() => API.patch(`${BASE}/${id}/hide`, { hidden }));

export const setArticleFlaggedApi = (id, flagged, reason = null) =>
  handleRequest(() =>
    API.patch(`${BASE}/${id}/flag`, { flagged, reason })
  );
