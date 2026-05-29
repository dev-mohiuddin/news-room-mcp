import { API, handleRequest } from "@/lib/http";

const BASE = "/api/v1/articles";

/**
 * ============================================================
 *  Wizard API client — mirrors the multi-step wizard endpoints
 * ============================================================
 */

/* ── Wizard lifecycle ────────────────────────────────── */

export const startWizardApi = (payload) =>
  handleRequest(() => API.post(`${BASE}/wizard/start`, payload));

export const runStageApi = (articleId, stage) =>
  handleRequest(() =>
    API.post(`${BASE}/${articleId}/stages/${stage}/run`)
  );

export const approveStageApi = (articleId, stage) =>
  handleRequest(() =>
    API.post(`${BASE}/${articleId}/stages/${stage}/approve`)
  );

export const regenerateStageApi = (articleId, stage) =>
  handleRequest(() =>
    API.post(`${BASE}/${articleId}/stages/${stage}/regenerate`)
  );

export const retryStageApi = (articleId, stage) =>
  handleRequest(() =>
    API.post(`${BASE}/${articleId}/stages/${stage}/retry`)
  );

export const abandonWizardApi = (articleId) =>
  handleRequest(() => API.post(`${BASE}/${articleId}/wizard/abandon`));

/* ── Brief / outline edits ───────────────────────────── */

export const patchBriefSelectionsApi = (articleId, selectedCanonicalUrls) =>
  handleRequest(() =>
    API.patch(`${BASE}/${articleId}/brief/source-selections`, {
      selectedCanonicalUrls,
    })
  );

export const patchOutlineApi = (articleId, body) =>
  handleRequest(() => API.patch(`${BASE}/${articleId}/outline`, body));

export const appendOutlineSectionApi = (articleId, section) =>
  handleRequest(() =>
    API.post(`${BASE}/${articleId}/outline/sections`, section)
  );

export const removeOutlineSectionApi = (articleId, idx) =>
  handleRequest(() =>
    API.delete(`${BASE}/${articleId}/outline/sections/${idx}`)
  );

/* ── Stream replay ───────────────────────────────────── */

export const getStageChunksApi = (articleId, stage, since = -1) =>
  handleRequest(() =>
    API.get(`${BASE}/${articleId}/stages/${stage}/chunks`, {
      params: { since },
    })
  );
