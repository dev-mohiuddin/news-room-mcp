import { API, handleRequest } from "@/lib/http";

const PUBLIC_BASE = "/api/v1/settings/public";
const ADMIN_BASE = "/api/v1/admin/settings";

/* ── Public ── */
export const getPublicSettingsApi = () =>
  handleRequest(() => API.get(PUBLIC_BASE));

/* ── Admin ── */
export const getAdminSettingsApi = () =>
  handleRequest(() => API.get(ADMIN_BASE));

export const patchSettingsSectionApi = (section, payload) =>
  handleRequest(() => API.patch(`${ADMIN_BASE}/${section}`, payload));

export const replaceFeatureFlagsApi = (features) =>
  handleRequest(() => API.put(`${ADMIN_BASE}/feature-flags`, { features }));

export const toggleFeatureFlagApi = (flagId, payload) =>
  handleRequest(() =>
    API.patch(`${ADMIN_BASE}/feature-flags/${flagId}`, payload)
  );
