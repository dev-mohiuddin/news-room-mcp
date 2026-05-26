import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Web search providers — Brave (primary) + Exa (fallback)
 * ============================================================
 *
 *  Both adapters return a normalized array:
 *    [{ url, title, snippet, language }]
 *
 *  Per Requirement 2: 10 second per-request timeout, then fall back.
 */

const SEARCH_TIMEOUT_MS = 10_000;

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
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
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
  const apiKey = process.env.EXA_API_KEY;
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
