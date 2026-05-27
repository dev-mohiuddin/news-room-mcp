/**
 * Helpers used across the analytics dashboards.
 */

/**
 * Convert "2026-05-23" → "May 23" for chart x-axis labels.
 */
export const formatDayKey = (dayKey) => {
  if (!dayKey) return "";
  const d = new Date(`${dayKey}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dayKey;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Friendly label for a referrer bucket from the backend.
 */
export const REFERRER_LABEL = {
  organic_search: "Organic Search",
  direct: "Direct",
  social: "Social",
  referral: "Referral",
  email: "Email",
  unknown: "Unknown",
};

export const REFERRER_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#2DD4BF",
  "#F59E0B",
  "#EC4899",
  "#64748B",
];

export const SEO_BAND_COLORS = {
  "0-49": "#EF4444",
  "50-69": "#F59E0B",
  "70-84": "#3B82F6",
  "85-94": "#8B5CF6",
  "95-100": "#10B981",
};

export const PLAN_COLORS = {
  free: "#64748B",
  starter: "#3B82F6",
  pro: "#8B5CF6",
  agency: "#2DD4BF",
};

/**
 * Decorate the daily series with a friendly axis label.
 */
export const decorateDaily = (rows = []) =>
  rows.map((r) => ({ ...r, label: formatDayKey(r.day) }));

/**
 * Pick a sensible color for a plan code, falling back to a deterministic
 * fallback so unknown codes still render.
 */
export const colorForPlan = (code) => {
  if (PLAN_COLORS[code]) return PLAN_COLORS[code];
  // Deterministic fallback based on string hash so colors are stable
  const palette = ["#3B82F6", "#8B5CF6", "#2DD4BF", "#F59E0B", "#EC4899", "#10B981"];
  let h = 0;
  for (let i = 0; i < (code || "").length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};
