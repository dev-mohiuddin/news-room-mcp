import { logger } from "#utils/logger.js";
import { canonicalUrl, sha256Hex } from "#utils/textUtil.js";
import { braveSearch, exaSearch } from "#services/external/searchProviders.js";
import {
  filterUsableCandidates,
  scrapeOneSource,
  dedupeScrapedSources,
  summarizeSourcesAsBrief,
  truncateExcerpt,
} from "#services/article/researchService.js";
import { throwError } from "#utils/throwErrorUtil.js";

/**
 * ============================================================
 *  Standalone Research Hub — /api/v1/research/*
 * ============================================================
 *
 *  Powers the user-facing "Research" page. Distinct from the
 *  article pipeline's `runResearchStage`:
 *
 *    - Stateless (no ResearchBrief persisted; the page is ephemeral
 *      until the user chooses to "Use in article").
 *    - Operates per-call: search, summarize on demand.
 *    - Reuses the same primitives (paywall/robots/dedupe/Haiku
 *      summarizer) from researchService so rules never drift.
 *
 *  Graceful degradation:
 *    - Missing BRAVE_SEARCH_API_KEY + EXA_API_KEY → throwError 503.
 *    - Anthropic missing → summarize step throws; controller maps to
 *      a 503 with a friendly message and the user can still see sources.
 */

const SEARCH_LIMIT = 10;
const MAX_SUMMARIZE_SOURCES = 5;

const isSearchConfigured = () =>
  Boolean(process.env.BRAVE_SEARCH_API_KEY || process.env.EXA_API_KEY);

/* ──────────────────────────────────────────────────────────
 *  Search a topic across Brave (primary) + Exa (fallback)
 *  Returns a normalized, filtered, paywall-aware source list
 *  WITHOUT scraping (fast — typical < 2s).
 * ────────────────────────────────────────────────────────── */
export const searchTopic = async ({ topic, targetKeyword, depth = "deep" }) => {
  if (!isSearchConfigured()) {
    throwError(
      "Web search is not configured on this server. Please contact your administrator.",
      503,
      { code: "RESEARCH_SEARCH_NOT_CONFIGURED" }
    );
  }

  const query = `${topic} ${targetKeyword || ""}`.trim();
  const count = depth === "quick" ? 5 : depth === "comprehensive" ? 15 : 10;

  let candidates = [];
  let provider = "brave";

  /* Brave first */
  try {
    candidates = await braveSearch({ query, count });
  } catch (err) {
    logger.warn("[research-hub] Brave failed", { message: err.message });
  }

  let usable = await filterUsableCandidates(candidates);

  /* Exa fallback if Brave came back thin */
  if (usable.length < Math.min(5, count)) {
    try {
      const exa = await exaSearch({ query, numResults: count });
      const exaUsable = await filterUsableCandidates(exa);
      const seen = new Set(usable.map((u) => u.canonical));
      const merged = [...usable];
      for (const c of exaUsable) {
        if (!seen.has(c.canonical)) {
          merged.push(c);
          seen.add(c.canonical);
        }
      }
      usable = merged;
      provider = candidates.length === 0 ? "exa" : "brave+exa";
    } catch (err) {
      logger.warn("[research-hub] Exa fallback failed", { message: err.message });
    }
  }

  /* Shape for the frontend SourceCard component */
  const sources = usable.slice(0, SEARCH_LIMIT).map((c, idx) => {
    let domain = "";
    try {
      domain = new URL(c.canonical || c.url).hostname.replace(/^www\./, "");
    } catch {
      domain = "";
    }
    return {
      id: `s-${sha256Hex(c.canonical || c.url).slice(0, 8)}`,
      title: c.title || c.canonical,
      url: c.canonical || c.url,
      originalUrl: c.url,
      domain,
      snippet: c.snippet || "",
      // Heuristic relevance — Brave returns results in rank order; we
      // approximate a 0-100 score for the card UI without an extra LLM call.
      score: Math.max(40, 100 - idx * 6),
      date: null,
      reading: c.snippet
        ? `${Math.max(1, Math.round((c.snippet.length / 5) / 200))} min`
        : null,
    };
  });

  return {
    sources,
    provider,
    query,
    foundCount: candidates.length,
    usableCount: usable.length,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Summarize a user-selected set of sources into a research
 *  brief (thesis + key facts + open questions).
 *
 *  body: { topic, targetKeyword, urls: string[] }
 *  Picks up the URLs from the previous searchTopic step so we
 *  re-scrape on demand (cheap, no DB persistence).
 * ────────────────────────────────────────────────────────── */
export const summarizeSelected = async ({ topic, targetKeyword, urls }) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    throwError("Select at least one source to summarize", 400);
  }
  if (urls.length > MAX_SUMMARIZE_SOURCES) {
    throwError(`At most ${MAX_SUMMARIZE_SOURCES} sources can be summarized at once`, 400);
  }

  /* Scrape each — Firecrawl → Jina fallback handled by primitive */
  const scraped = [];
  for (const rawUrl of urls) {
    let cand;
    try {
      cand = { url: rawUrl, canonical: canonicalUrl(rawUrl), title: "" };
    } catch {
      continue;
    }
    const out = await scrapeOneSource(cand);
    if (!out) continue;
    const cleaned = String(out.markdown || "").trim();
    if (!cleaned) continue;
    scraped.push({
      url: cand.canonical,
      originalUrl: cand.url,
      title: out.title || cand.title || cand.canonical,
      snippet: "",
      cleanedMarkdown: truncateExcerpt(cleaned),
      contentHash: sha256Hex(cleaned),
      retrievedAt: new Date(),
      scraperProvider: out.scraperProvider,
    });
  }

  const { kept } = dedupeScrapedSources(scraped);
  if (kept.length === 0) {
    throwError(
      "Could not retrieve content from any of the selected sources. Try different sources.",
      422,
      { code: "RESEARCH_NO_SCRAPABLE_CONTENT" }
    );
  }

  /* Haiku summarization — same primitive used by the article pipeline */
  let summary;
  try {
    summary = await summarizeSourcesAsBrief({
      topic,
      targetKeyword: targetKeyword || topic,
      sources: kept,
    });
  } catch (err) {
    logger.warn("[research-hub] summarization failed", { message: err.message });
    throwError(
      "AI summarization is temporarily unavailable. Please try again shortly.",
      503,
      { code: "RESEARCH_SUMMARIZER_UNAVAILABLE" }
    );
  }

  /* Bullets returned by the primitive already carry [n] citation refs.
   * Build a brief shape compatible with the frontend's existing rendering
   * (`brief.thesis`, `brief.keyFacts`, `brief.questions`).            */
  const keyFacts = (summary.bullets || []).map((b) => b.text).slice(0, 8);
  const thesis = keyFacts[0]
    ? `Synthesis based on ${kept.length} verified sources: ${keyFacts[0]}`
    : `Research synthesis for "${topic}" across ${kept.length} sources.`;

  // Cheap heuristic for "open questions" — the user will expand from here.
  const questions = [
    `What are the practical first steps to apply ${targetKeyword || topic}?`,
    `Which trade-offs matter most when adopting this in production?`,
    `What changed in the last 12 months that an article should highlight?`,
  ];

  return {
    brief: {
      title: topic,
      keyword: targetKeyword || topic,
      thesis,
      keyFacts,
      questions,
      sources: kept.map((s) => ({
        url: s.url,
        title: s.title,
      })),
    },
    keptSourceCount: kept.length,
    cost: summary.cost || null,
  };
};
