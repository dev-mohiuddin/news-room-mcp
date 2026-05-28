import { logger } from "#utils/logger.js";
import { getProviderConfig } from "#services/system/integrationService.js";

/**
 * ============================================================
 *  Web search providers — Brave (primary) + Exa (fallback)
 * ============================================================
 *
 *  Both adapters return a normalized array:
 *    [{ url, title, snippet, language }]
 *
 *  Per Requirement 2: 10 second per-request timeout, then fall back.
 *
 *  Key resolution order (per call):
 *    1. Admin-managed integration record (DB, AES-encrypted)
 *    2. Process env var
 *
 *  This means admins can rotate the keys live from /admin/integrations
 *  without redeploying the API.
 */

const SEARCH_TIMEOUT_MS = 10_000;

const resolveBraveKey = async () => {
  try {
    const cfg = await getProviderConfig("brave");
    if (cfg?.apiKey) return cfg.apiKey;
  } catch {
    /* fall through */
  }
  return process.env.BRAVE_SEARCH_API_KEY || null;
};

const resolveExaKey = async () => {
  try {
    const cfg = await getProviderConfig("exa");
    if (cfg?.apiKey) return cfg.apiKey;
  } catch {
    /* fall through */
  }
  return process.env.EXA_API_KEY || null;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = SEARCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
};

/* ── Brave Search ─────────────────────────────────────────── */

export const braveSearch = async ({ query, count = 10 }) => {
  const apiKey = await resolveBraveKey();
  if (!apiKey) {
    logger.warn("Brave Search not configured; skipping");
    return [];
  }
  const params = new URLSearchParams({
    q: query,
    count: String(count),
    safesearch: "moderate",
    text_decorations: "false",
  });
  const url = `https://api.search.brave.com/res/v1/web/search?${params.toString()}`;

  const res = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });
  if (!res.ok) {
    throw new Error(`Brave search failed: ${res.status}`);
  }
  const data = await res.json();
  const items = data?.web?.results || [];
  return items.map((r) => ({
    url: r.url,
    title: r.title,
    snippet: r.description || "",
    language: r.language || null,
  }));
};

/* ── Exa AI semantic search ───────────────────────────────── */

export const exaSearch = async ({ query, numResults = 10 }) => {
  const apiKey = await resolveExaKey();
  if (!apiKey) {
    logger.warn("Exa AI not configured; skipping fallback");
    return [];
  }
  const res = await fetchWithTimeout("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      numResults,
      type: "auto",
      contents: { text: false, highlights: false },
    }),
  });
  if (!res.ok) {
    throw new Error(`Exa search failed: ${res.status}`);
  }
  const data = await res.json();
  const items = data?.results || [];
  return items.map((r) => ({
    url: r.url,
    title: r.title,
    snippet: r.text || r.summary || "",
    language: null,
  }));
};
