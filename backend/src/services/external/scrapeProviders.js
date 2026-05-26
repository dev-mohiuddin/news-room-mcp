import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Web scraping providers — Firecrawl (primary) + Jina (fallback)
 * ============================================================
 *
 *  Both adapters return a normalized result:
 *    { markdown, title, url }
 *
 *  Per Requirement 2.4 / 2.5:
 *    - Firecrawl: 30 s timeout
 *    - Jina:      20 s timeout (used only after Firecrawl fails)
 */

const FIRECRAWL_TIMEOUT_MS = 30_000;
const JINA_TIMEOUT_MS = 20_000;

const fetchWithTimeout = async (url, options = {}, timeoutMs) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
};

/* ── Firecrawl ────────────────────────────────────────────── */

export const firecrawlScrape = async (targetUrl) => {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    logger.warn("Firecrawl not configured");
    return null;
  }
  const res = await fetchWithTimeout(
    "https://api.firecrawl.dev/v1/scrape",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    },
    FIRECRAWL_TIMEOUT_MS
  );
  if (!res.ok) {
    throw new Error(`Firecrawl ${res.status} for ${targetUrl}`);
  }
  const data = await res.json();
  const markdown = data?.data?.markdown || "";
  const title = data?.data?.metadata?.title || "";
  if (!markdown.trim()) {
    throw new Error(`Firecrawl returned empty markdown for ${targetUrl}`);
  }
  return { markdown, title, url: targetUrl };
};

/* ── Jina Reader (free, no auth required for the basic endpoint) ── */

export const jinaScrape = async (targetUrl) => {
  const apiKey = process.env.JINA_API_KEY;
  const headers = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  // Jina Reader: GET https://r.jina.ai/<encoded-url>
  const res = await fetchWithTimeout(
    `https://r.jina.ai/${targetUrl}`,
    { headers },
    JINA_TIMEOUT_MS
  );
  if (!res.ok) {
    throw new Error(`Jina ${res.status} for ${targetUrl}`);
  }
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Jina returned empty content for ${targetUrl}`);
  }
  return { markdown: text, title: "", url: targetUrl };
};
