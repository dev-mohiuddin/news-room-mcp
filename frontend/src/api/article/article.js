import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/articles";

/* ── Pipeline ── */
export const generateArticleApi = (payload) =>
  handleRequest(() => API.post(`${BASE}/generate`, payload));

export const getQuotaApi = () =>
  handleRequest(() => API.get("/api/v1/quota"));

/* ── CRUD ── */
export const listArticlesApi = (params) =>
  handleRequest(() => API.get(BASE, { params }));

export const getArticleApi = (id) =>
  handleRequest(() => API.get(`${BASE}/${id}`));

export const updateArticleApi = (id, data) =>
  handleRequest(() => API.patch(`${BASE}/${id}`, data));

export const deleteArticleApi = (id) =>
  handleRequest(() => API.delete(`${BASE}/${id}`));

export const restoreArticleApi = (id) =>
  handleRequest(() => API.post(`${BASE}/${id}/restore`));

export const publishArticleApi = (id, payload) =>
  handleRequest(() => API.post(`${BASE}/${id}/publish`, payload));

/* ── Lifecycle controls ── */
export const retryArticleApi = (id, payload = {}) =>
  handleRequest(() => API.post(`${BASE}/${id}/retry`, payload));

export const cancelArticleApi = (id) =>
  handleRequest(() => API.post(`${BASE}/${id}/cancel`));

export const duplicateArticleApi = (id) =>
  handleRequest(() => API.post(`${BASE}/${id}/duplicate`));

export const exportArticleUrl = (id, format = "markdown") =>
  `${BASE}/${id}/export?format=${encodeURIComponent(format)}`;

/**
 * Download the rendered export with the user's auth headers + cookies, then
 * trigger a browser download. Avoids `window.open` which loses Bearer auth.
 */
export const downloadArticleExport = async (id, format = "markdown") => {
  const res = await API.get(exportArticleUrl(id, format), {
    responseType: "blob",
  });
  const blob = res.data;
  const disposition = res.headers["content-disposition"] || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1] || `article-${id}.${format === "json" ? "json" : format === "html" ? "html" : "md"}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};


/* ── Phase B: on-demand agents ── */

export const generateSocialPackApi = (id) =>
  handleRequest(() => API.post(`${BASE}/${id}/social-pack`));

export const generateImageBriefApi = (id) =>
  handleRequest(() => API.post(`${BASE}/${id}/featured-image/brief`));

export const searchUnsplashApi = (id, query) =>
  handleRequest(() =>
    API.get(`${BASE}/${id}/featured-image/unsplash`, { params: { query } })
  );

export const selectUnsplashImageApi = (id, payload) =>
  handleRequest(() => API.post(`${BASE}/${id}/featured-image/select`, payload));

export const uploadFeaturedImageApi = (id, file, alt = "") => {
  const fd = new FormData();
  fd.append("file", file);
  if (alt) fd.append("alt", alt);
  return handleRequest(() =>
    API.post(`${BASE}/${id}/featured-image/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
};
