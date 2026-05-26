import { logger } from "#utils/logger.js";
import { canonicalUrl, sha256Hex, htmlToPlain } from "#utils/textUtil.js";
import { isPaywalled } from "#constants/paywallBlocklist.js";
import { isAllowedByRobots } from "#utils/robotsUtil.js";
import { braveSearch, exaSearch } from "#services/external/searchProviders.js";
import {
  firecrawlScrape,
  jinaScrape,
} from "#services/external/scrapeProviders.js";
import { upsertBriefForArticle } from "#repositories/researchBriefRepository.js";
import { generateText, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import {
  RESEARCH_SUMMARIZER_PERSONA,
  composeSystemPrompt,
} from "#services/article/personas/loader.js";

/**
 * ============================================================
 *  Research stage — Requirement 2
 * ============================================================
 *
 *  Pipeline:
 *    1. Brave Search (10 candidates, 10s timeout)
 *    2. Filter usable: scheme http(s), not paywalled, robots allowed
 *    3. If < 5 usable OR Brave failed → Exa fallback (10s timeout)
 *    4. Top 5 ranked → scrape with Firecrawl (30s) → fallback to Jina (20s)
 *    5. Dedupe by canonical URL, then by SHA-256 of cleaned markdown
 *    6. Truncate excerpts to 20,000 chars; persist a ResearchBrief
 *    7. 240s wall-clock budget; if exceeded, stop and proceed
 *    8. Need ≥ 3 kept sources; otherwise INSUFFICIENT_SOURCES
 *
 *  Returns:
 *    { brief, sourcesKept, summaryUsage }
 *  Throws an error with `code: "INSUFFICIENT_SOURCES"` if the threshold
 *  isn't met. The caller transitions the article to FAILED with that reason.
 */

const MAX_SOURCES = 5;
const MIN_USABLE_FROM_BRAVE = 5;
const MIN_KEPT = 3;
const STAGE_BUDGET_MS = 240_000;
const EXCERPT_CHAR_LIMIT = 20_000;

const filterUsable = async (candidates) => {
  const usable = [];
  for (const c of candidates) {
    if (!c.url) continue;
    let parsed;
    try {
      parsed = new URL(c.url);
    } catch {
      continue;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) continue;
    if (isPaywalled(c.url)) continue;
    // robots.txt check (5s; failures default to "allow")
    const allowed = await isAllowedByRobots(c.url).catch(() => true);
    if (!allowed) continue;

    // Heuristic: prefer English snippets; if language unknown, allow.
    if (c.language && c.language.toLowerCase() !== "en") continue;

    usable.push({ ...c, canonical: canonicalUrl(c.url) });
  }
  return usable;
};

const dedupe = (sources) => {
  const seenUrl = new Set();
  const seenHash = new Set();
  const kept = [];
  const skipped = [];
  for (const s of sources) {
    if (seenUrl.has(s.canonical)) {
      skipped.push({ ...s, skipReason: "duplicate_url" });
      continue;
    }
    if (seenHash.has(s.contentHash)) {
      skipped.push({ ...s, skipReason: "duplicate_content" });
      continue;
    }
    seenUrl.add(s.canonical);
    seenHash.add(s.contentHash);
    kept.push(s);
  }
  return { kept, skipped };
};

const scrapeOne = async (cand) => {
  // Try Firecrawl first.
  try {
    const out = await firecrawlScrape(cand.canonical);
    if (out?.markdown) {
      return { ...cand, ...out, scraperProvider: "firecrawl" };
    }
  } catch (err) {
    logger.debug("Firecrawl failed; falling back to Jina", {
      url: cand.canonical,
      message: err.message,
    });
  }
  try {
    const out = await jinaScrape(cand.canonical);
    if (out?.markdown) {
      return { ...cand, ...out, scraperProvider: "jina" };
    }
  } catch (err) {
    logger.debug("Jina failed; dropping source", {
      url: cand.canonical,
      message: err.message,
    });
  }
  return null;
};

const truncate = (text, max = EXCERPT_CHAR_LIMIT) =>
  text.length > max ? text.slice(0, max) : text;

const summarizeBrief = async ({ topic, targetKeyword, sources }) => {
  // One quick Haiku pass to produce 5–8 bullet "key facts" with attached
  // source URLs. The output is persisted on the brief and re-injected into
  // the outline + draft prompts.
  const sourceBlock = sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title || s.canonical}\n${s.canonical}\n${(
          s.cleanedMarkdown || ""
        ).slice(0, 1500)}`
    )
    .join("\n\n---\n\n");

  const prompt = `Topic: ${topic}\nTarget keyword: ${targetKeyword}\n\nSources:\n${sourceBlock}\n\nGenerate 6-8 concise factual bullets summarizing the most important, citable facts about the topic. Each bullet should be a single sentence and reference 1-2 source numbers in brackets like [1] or [2,3].`;

  const result = await generateText({
    model: HAIKU_MODEL,
    system: composeSystemPrompt(RESEARCH_SUMMARIZER_PERSONA, [
      "OUTPUT CONTRACT:",
      "- 6 to 8 bullets, one sentence each.",
      "- End every bullet with [n] or [n,m] using the supplied source numbers only.",
      "- No preamble, no headings, no commentary.",
    ]),
    prompt,
    maxTokens: 1024,
    temperature: 0.2,
  });

  const lines = (result.text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => /^[-*•]/.test(l) || /^\[\d/.test(l) || /^\d+\./.test(l));

  const bullets = lines.slice(0, 8).map((line) => {
    const text = line.replace(/^[-*•]\s*/, "").trim();
    const refs = Array.from(text.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g))
      .flatMap((m) => m[1].split(/\s*,\s*/))
      .map((n) => parseInt(n, 10) - 1)
      .filter((idx) => idx >= 0 && idx < sources.length);
    const uniqueRefs = [...new Set(refs)];
    return {
      text,
      citationUrls: uniqueRefs.map((idx) => sources[idx].canonical),
    };
  });

  return { bullets, usage: result.usage, latencyMs: result.latencyMs, model: result.model, cost: result.cost };
};

/* ── Public entry point ───────────────────────────────────── */

export const runResearchStage = async ({
  workspaceId,
  articleId,
  topic,
  targetKeyword,
}) => {
  const stageStart = Date.now();
  const remainingBudget = () => STAGE_BUDGET_MS - (Date.now() - stageStart);

  logger.info("[research] start", { articleId, topic, targetKeyword });

  /* Step 1 — Brave search */
  let candidates = [];
  let searchProvider = "brave";
  const searchStart = Date.now();

  try {
    candidates = await braveSearch({
      query: `${topic} ${targetKeyword}`,
      count: 10,
    });
  } catch (err) {
    logger.warn("[research] Brave search failed", { message: err.message });
    candidates = [];
  }

  /* Step 2 — usability filter */
  let usable = await filterUsable(candidates);

  /* Step 3 — Exa fallback if needed */
  if (usable.length < MIN_USABLE_FROM_BRAVE) {
    try {
      const exaCandidates = await exaSearch({
        query: `${topic} ${targetKeyword}`,
        numResults: 10,
      });
      const exaUsable = await filterUsable(exaCandidates);
      const merged = [...usable, ...exaUsable];
      // dedupe by canonical
      const seen = new Set();
      usable = merged.filter((c) => {
        if (seen.has(c.canonical)) return false;
        seen.add(c.canonical);
        return true;
      });
      searchProvider = usable.length > exaUsable.length ? "brave" : "exa";
    } catch (err) {
      logger.warn("[research] Exa fallback failed", { message: err.message });
    }
  }

  const searchDurationMs = Date.now() - searchStart;

  /* Step 4 — pick top N and scrape */
  const top = usable.slice(0, MAX_SOURCES);
  const scrapeStart = Date.now();

  const scraped = [];
  for (const cand of top) {
    if (remainingBudget() <= 5_000) {
      logger.warn("[research] stage budget nearly exhausted; stopping early");
      break;
    }
    const out = await scrapeOne(cand);
    if (!out) continue;
    const cleanedMarkdown = String(out.markdown || "");
    if (!cleanedMarkdown.trim()) continue;
    const contentHash = sha256Hex(cleanedMarkdown);
    scraped.push({
      url: cand.canonical,
      originalUrl: cand.url,
      title: out.title || cand.title || "",
      snippet: cand.snippet || "",
      cleanedMarkdown: truncate(cleanedMarkdown),
      contentHash,
      retrievedAt: new Date(),
      scraperProvider: out.scraperProvider,
      relevanceScore: 0,
    });
  }

  const scrapeDurationMs = Date.now() - scrapeStart;

  /* Step 5 — dedupe */
  const { kept, skipped } = dedupe(scraped);

  if (kept.length < MIN_KEPT) {
    const err = new Error("Not enough usable sources after research");
    err.code = "INSUFFICIENT_SOURCES";
    err.details = { keptCount: kept.length, skipped };
    throw err;
  }

  /* Step 6 — summarize via Haiku */
  let summary = { bullets: [], usage: {}, latencyMs: 0, cost: { usdCost: 0, flagged: false } };
  try {
    summary = await summarizeBrief({
      topic,
      targetKeyword,
      sources: kept,
    });
  } catch (err) {
    logger.warn("[research] brief summarization failed; continuing without bullets", {
      message: err.message,
    });
  }

  /* Step 7 — persist brief */
  const brief = await upsertBriefForArticle(workspaceId, articleId, {
    topic,
    targetKeyword,
    sources: [
      ...kept,
      ...skipped.map((s) => ({
        url: s.canonical || canonicalUrl(s.url || ""),
        originalUrl: s.url,
        title: s.title || "",
        snippet: s.snippet || "",
        cleanedMarkdown: "",
        contentHash: s.contentHash || sha256Hex(s.url || ""),
        retrievedAt: new Date(),
        scraperProvider: s.scraperProvider || "firecrawl",
        skipReason: s.skipReason,
      })),
    ],
    keptSourceCount: kept.length,
    skippedSourceCount: skipped.length,
    summaryBullets: summary.bullets,
    searchProvider,
    searchDurationMs,
    scrapeDurationMs,
  });

  logger.info("[research] done", {
    articleId,
    kept: kept.length,
    skipped: skipped.length,
    durationMs: Date.now() - stageStart,
  });

  return {
    brief,
    sourcesKept: kept,
    summaryCost: {
      stageName: "research",
      providerName: "anthropic",
      model: summary.model,
      promptTokens: summary.usage?.promptTokens || 0,
      completionTokens: summary.usage?.completionTokens || 0,
      unitsConsumed:
        (summary.usage?.promptTokens || 0) + (summary.usage?.completionTokens || 0),
      usdCost: summary.cost?.usdCost || 0,
      costFlagged: summary.cost?.flagged || false,
      latencyMs: summary.latencyMs || 0,
      ts: new Date(),
    },
  };
};

export const buildPlainTextFromHtmlList = (paragraphs) =>
  paragraphs.map((p) => htmlToPlain(p.html || "")).join("\n\n");
