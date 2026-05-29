import { logger } from "#utils/logger.js";
import { canonicalUrl, sha256Hex } from "#utils/textUtil.js";
import { useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import {
  RESEARCH_SUMMARIZER_PERSONA,
  composeSystemPrompt,
} from "#services/article/personas/loader.js";
import { ResearchBrief } from "#models/researchBriefModel.js";

/**
 * ============================================================
 *  Source Enrichment Service — Requirement 1
 * ============================================================
 *
 *  Materializes a per-source enrichment record (summary, key facts,
 *  illustrative snippet, suggested angle) for each user-selected source
 *  in a `ResearchBrief`, plus a brief-level aggregate
 *  (`crossSourceContrasts`, `sharedThemes`, `coverageGaps`).
 *
 *  Contract (per design.md "Extended ResearchBrief"):
 *
 *    sources[i].enrichment = {
 *      summary: string,                      // 2–3 sentences
 *      keyFacts: [{ text, citationUrl }],    // 3–5 items
 *      illustrativeSnippet: string,          // ≤ 25 words, verbatim
 *      suggestedAngle: string,               // 1 sentence (1–25 words)
 *      enrichedAt: Date,
 *      modelUsed: string,
 *      contentHash: string,                  // hash of cleanedMarkdown at enrich-time
 *    }
 *
 *    briefEnrichment = {
 *      crossSourceContrasts: [string],       // 0–3
 *      sharedThemes: [string],               // 0–5
 *      coverageGaps: [string],               // 0–3
 *      enrichedAt: Date,
 *    }
 *
 *  Operational rules (Requirements 1.3, 1.4, 1.6, 1.13):
 *    - Per-source Haiku timeout: 12 s. On timeout / network / shape error,
 *      log a warning and SKIP that source — siblings continue.
 *    - Parallelism: at most 8 sources processed concurrently. Remaining
 *      sources are queued and processed in subsequent batches.
 *    - Re-enrichment skip: if a source already carries an `enrichment`
 *      block whose `contentHash` matches the current `cleanedMarkdown`
 *      hash, skip the LLM call.
 *    - Property 2 invariant (Requirement 1.5): every emitted
 *      `keyFacts[].citationUrl` MUST be a member of the brief's persisted
 *      source set under `canonicalUrl` equality. Non-members are dropped.
 *    - Persistence is best-effort per source: a write failure on one
 *      source must not corrupt sibling sources.
 *
 *  This module is non-blocking by contract — callers (controller wiring)
 *  schedule it via `Promise.resolve().then(...)` so the HTTP response is
 *  not delayed. The service itself is plain async; the scheduling
 *  responsibility lives at the call site.
 */

const PER_SOURCE_TIMEOUT_MS = 12_000;
const MAX_PARALLEL = 8;
const ENRICHMENT_MODEL = HAIKU_MODEL;

const ENRICHMENT_TOOL_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 800 },
    keyFacts: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          text: { type: "string", minLength: 1, maxLength: 400 },
          citationUrl: { type: "string", minLength: 1 },
        },
        required: ["text", "citationUrl"],
      },
    },
    illustrativeSnippet: { type: "string", minLength: 1, maxLength: 400 },
    suggestedAngle: { type: "string", minLength: 1, maxLength: 200 },
  },
  required: ["summary", "keyFacts", "illustrativeSnippet", "suggestedAngle"],
};

const BRIEF_AGGREGATE_TOOL_SCHEMA = {
  type: "object",
  properties: {
    crossSourceContrasts: {
      type: "array",
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 300 },
    },
    sharedThemes: {
      type: "array",
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 200 },
    },
    coverageGaps: {
      type: "array",
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 200 },
    },
  },
  required: ["crossSourceContrasts", "sharedThemes", "coverageGaps"],
};

/**
 * Race a promise against a timeout. The original promise is not
 * cancellable (the underlying SDK call may still complete), but the
 * caller observes a timeout error within `timeoutMs`.
 */
const withTimeout = (promise, timeoutMs, label = "operation") =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const err = new Error(`${label} timed out after ${timeoutMs}ms`);
      err.code = "ENRICHMENT_TIMEOUT";
      reject(err);
    }, timeoutMs);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    );
  });

/** Word-count helper used to enforce the 25-word verbatim-snippet bound. */
const countWords = (str = "") =>
  String(str).trim().split(/\s+/u).filter(Boolean).length;

/**
 * Build the membership Set used by the Property 2 invariant check.
 * Keys are canonical URLs of every persisted (non-skipped) brief source.
 */
const buildAllowedUrlSet = (brief) => {
  const set = new Set();
  for (const s of brief?.sources || []) {
    if (s.skipReason) continue;
    const canon = canonicalUrl(s.url || "");
    if (canon) set.add(canon);
  }
  return set;
};

/**
 * Build the prompt sent to Haiku for a single source. The model is asked
 * to emit ONE submit_enrichment tool-use call.
 *
 *  - The source's canonical URL is the ONLY URL the model is told it may
 *    cite — the validator below double-checks every fact's citationUrl
 *    against the brief-wide allow-list.
 *  - cleanedMarkdown is truncated to 6,000 chars to keep latency under the
 *    12s per-source budget on Haiku.
 */
const buildSourcePrompt = ({ topic, targetKeyword, source }) =>
  [
    `Topic: ${topic}`,
    `Target keyword: ${targetKeyword}`,
    "",
    `Source URL (cite this exact URL in every keyFact): ${source.url}`,
    `Source title: ${source.title || "(untitled)"}`,
    "",
    "Source content (markdown, truncated):",
    String(source.cleanedMarkdown || "").slice(0, 6000),
    "",
    "Submit ONE submit_enrichment tool call with:",
    "- summary: 2 to 3 sentences describing what this source contributes.",
    "- keyFacts: 3 to 5 entries. Each `text` is one factual sentence drawn from the source. Each `citationUrl` MUST be exactly the Source URL above.",
    "- illustrativeSnippet: a verbatim quote from the source, 25 words or fewer, that captures the source's distinctive angle. Do NOT paraphrase. If no short verbatim quote fits, pick the shortest representative sentence.",
    "- suggestedAngle: ONE sentence (1 to 25 words) describing how this source distinguishes itself from generic coverage of the topic.",
  ].join("\n");

/**
 * Validate / shape the raw tool-use input returned by Haiku.
 *
 * Drops any `keyFacts[]` entry whose `citationUrl` is not a member of the
 * brief-wide allow-list under `canonicalUrl` equality (Property 2).
 *
 * Returns `null` if the resulting object would be unusable
 * (zero key-facts left, missing required fields, etc.) — the caller
 * treats `null` as a shape failure and skips the source.
 */
const shapeEnrichmentPayload = (raw, allowedUrlSet) => {
  if (!raw || typeof raw !== "object") return null;
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const illustrativeSnippet =
    typeof raw.illustrativeSnippet === "string"
      ? raw.illustrativeSnippet.trim()
      : "";
  const suggestedAngle =
    typeof raw.suggestedAngle === "string" ? raw.suggestedAngle.trim() : "";

  if (!summary || !illustrativeSnippet || !suggestedAngle) return null;

  // Trim verbatim snippet to ≤ 25 words (Requirement 1.3).
  let snippet = illustrativeSnippet;
  if (countWords(snippet) > 25) {
    snippet = snippet.split(/\s+/u).slice(0, 25).join(" ");
  }

  // Trim suggestedAngle to ≤ 25 words.
  let angle = suggestedAngle;
  if (countWords(angle) > 25) {
    angle = angle.split(/\s+/u).slice(0, 25).join(" ");
  }

  const factsRaw = Array.isArray(raw.keyFacts) ? raw.keyFacts : [];
  const keyFacts = [];
  for (const f of factsRaw) {
    if (!f || typeof f !== "object") continue;
    const text = typeof f.text === "string" ? f.text.trim() : "";
    const citationUrlRaw =
      typeof f.citationUrl === "string" ? f.citationUrl.trim() : "";
    if (!text || !citationUrlRaw) continue;
    const canon = canonicalUrl(citationUrlRaw);
    // Property 2 invariant: drop any citation outside the brief allow-list.
    if (!allowedUrlSet.has(canon)) continue;
    keyFacts.push({ text, citationUrl: canon });
  }

  if (keyFacts.length < 1) return null;
  // Cap at 5 entries (schema upper bound). Lower bound (3) is enforced by the
  // tool schema itself; if the model returned fewer than 3 we accept what
  // we have rather than dropping the source — better than silent skipping
  // since the consumer treats partial enrichment as best-effort.
  const cappedFacts = keyFacts.slice(0, 5);

  return {
    summary,
    keyFacts: cappedFacts,
    illustrativeSnippet: snippet,
    suggestedAngle: angle,
  };
};

/**
 * Enrich a single source. Returns the persistable enrichment block, or
 * `null` on any failure (timeout, network, shape error). Failures are
 * logged with `articleId` + canonical URL + failure category.
 *
 *  Failure isolation (Requirement 1.6): callers must not propagate this
 *  function's rejections — the service iterates sources individually.
 */
const enrichOneSource = async ({
  brief,
  source,
  allowedUrlSet,
  articleId,
}) => {
  const sourceUrl = canonicalUrl(source.url || "");
  try {
    const result = await withTimeout(
      useTool({
        model: ENRICHMENT_MODEL,
        system: composeSystemPrompt(RESEARCH_SUMMARIZER_PERSONA, [
          "RUNTIME CONSTRAINTS:",
          "- Submit one submit_enrichment tool call. No prose outside the tool.",
          "- Every keyFact citationUrl MUST be the supplied Source URL verbatim.",
          "- illustrativeSnippet MUST be a verbatim quote from the source content.",
        ]),
        prompt: buildSourcePrompt({
          topic: brief.topic,
          targetKeyword: brief.targetKeyword,
          source,
        }),
        toolName: "submit_enrichment",
        toolDescription:
          "Submit a per-source enrichment record (summary, key facts, illustrative snippet, suggested angle).",
        toolInputSchema: ENRICHMENT_TOOL_SCHEMA,
        maxTokens: 1024,
        temperature: 0.3,
      }),
      PER_SOURCE_TIMEOUT_MS,
      `enrichOneSource(${sourceUrl})`
    );

    const shaped = shapeEnrichmentPayload(result.input, allowedUrlSet);
    if (!shaped) {
      logger.warn("[source-enrichment] shape check failed; skipping source", {
        articleId,
        sourceUrl,
        category: "shape_invalid",
      });
      return null;
    }

    return {
      ...shaped,
      enrichedAt: new Date(),
      modelUsed: result.model || ENRICHMENT_MODEL,
      contentHash: source.contentHash || sha256Hex(source.cleanedMarkdown || ""),
    };
  } catch (err) {
    const category =
      err.code === "ENRICHMENT_TIMEOUT"
        ? "timeout"
        : err.status === 429 || /rate.?limit/i.test(err.message || "")
          ? "rate_limit"
          : /network|fetch|ECONN|ETIMEDOUT/i.test(err.message || "")
            ? "network"
            : "exception";
    logger.warn("[source-enrichment] per-source failure; skipping", {
      articleId,
      sourceUrl,
      category,
      message: err.message,
    });
    return null;
  }
};

/**
 * Process `items` through `worker` with at most `MAX_PARALLEL` concurrent
 * invocations. Items beyond the first batch are queued and processed
 * sequentially (one per slot) as earlier ones resolve.
 *
 * This is the queueing contract from Requirement 1.4: "at most 8
 * processed in parallel; additional sources beyond 8 SHALL be queued
 * and processed sequentially after the first batch completes."
 *
 * Returns an array of worker-result/null pairs aligned positionally to
 * `items` (so callers can correlate results with their input source).
 */
const runWithConcurrency = async (items, worker, concurrency) => {
  const results = new Array(items.length).fill(null);
  let cursor = 0;
  const runners = new Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(async () => {
      // Each runner pulls the next available index until the queue drains.
      for (;;) {
        const idx = cursor;
        cursor += 1;
        if (idx >= items.length) return;
        results[idx] = await worker(items[idx], idx);
      }
    });
  await Promise.all(runners);
  return results;
};

/**
 * Build a brief-level aggregate from the per-source enrichments. Best
 * effort: a Haiku call failure here does NOT cause `enrichSelectedSources`
 * to throw — we return an empty aggregate instead.
 */
const buildBriefAggregate = async ({ brief, perSourceEnrichments, articleId }) => {
  const successes = perSourceEnrichments.filter(Boolean);
  if (successes.length < 2) {
    // Cross-source contrasts only make sense with ≥ 2 enriched sources.
    return {
      crossSourceContrasts: [],
      sharedThemes: [],
      coverageGaps: [],
      enrichedAt: new Date(),
    };
  }

  const sourceBlock = successes
    .map((e, i) => `[${i + 1}] ${e.suggestedAngle}\nSummary: ${e.summary}`)
    .join("\n\n---\n\n");

  const prompt = [
    `Topic: ${brief.topic}`,
    `Target keyword: ${brief.targetKeyword}`,
    "",
    "Per-source enrichments:",
    sourceBlock,
    "",
    "Submit ONE submit_brief_aggregate tool call with:",
    "- crossSourceContrasts: 0 to 3 short notes describing where sources disagree or emphasize different angles.",
    "- sharedThemes: 0 to 5 short phrases that recur across the sources.",
    "- coverageGaps: 0 to 3 short notes describing topics relevant to the keyword that none of the sources cover.",
  ].join("\n");

  try {
    const result = await withTimeout(
      useTool({
        model: ENRICHMENT_MODEL,
        system: composeSystemPrompt(RESEARCH_SUMMARIZER_PERSONA, [
          "RUNTIME CONSTRAINTS:",
          "- Submit one submit_brief_aggregate tool call. No prose outside the tool.",
          "- Lists may be empty when nothing fits.",
        ]),
        prompt,
        toolName: "submit_brief_aggregate",
        toolDescription:
          "Submit cross-source contrasts, shared themes, and coverage gaps for the brief.",
        toolInputSchema: BRIEF_AGGREGATE_TOOL_SCHEMA,
        maxTokens: 800,
        temperature: 0.3,
      }),
      PER_SOURCE_TIMEOUT_MS,
      "buildBriefAggregate"
    );

    const input = result.input || {};
    const sanitizeList = (arr, max) =>
      Array.isArray(arr)
        ? arr
            .filter((x) => typeof x === "string" && x.trim())
            .map((x) => x.trim())
            .slice(0, max)
        : [];

    return {
      crossSourceContrasts: sanitizeList(input.crossSourceContrasts, 3),
      sharedThemes: sanitizeList(input.sharedThemes, 5),
      coverageGaps: sanitizeList(input.coverageGaps, 3),
      enrichedAt: new Date(),
    };
  } catch (err) {
    logger.warn("[source-enrichment] brief aggregate failed; emitting empty aggregate", {
      articleId,
      message: err.message,
    });
    return {
      crossSourceContrasts: [],
      sharedThemes: [],
      coverageGaps: [],
      enrichedAt: new Date(),
    };
  }
};

/**
 * Persist a single source's enrichment block atomically against the
 * `ResearchBrief` document. Uses a positional-update so a failure on one
 * source does not roll back sibling writes (Requirement 1.4).
 */
const persistSourceEnrichment = async ({
  workspaceId,
  articleId,
  sourceUrl,
  enrichment,
}) => {
  try {
    await ResearchBrief.updateOne(
      { articleId, workspaceId, "sources.url": sourceUrl },
      { $set: { "sources.$.enrichment": enrichment } }
    ).exec();
    return true;
  } catch (err) {
    logger.warn("[source-enrichment] persistence failed for source; sibling writes preserved", {
      articleId,
      sourceUrl,
      message: err.message,
    });
    return false;
  }
};

/**
 * Persist the brief-level aggregate. Best-effort.
 */
const persistBriefAggregate = async ({
  workspaceId,
  articleId,
  briefEnrichment,
}) => {
  try {
    await ResearchBrief.updateOne(
      { articleId, workspaceId },
      { $set: { briefEnrichment } }
    ).exec();
    return true;
  } catch (err) {
    logger.warn("[source-enrichment] brief aggregate persistence failed", {
      articleId,
      message: err.message,
    });
    return false;
  }
};

/**
 * Public entry point.
 *
 *  @param {object}   args
 *  @param {object}   args.brief                  - Loaded ResearchBrief document.
 *  @param {string[]} args.selectedCanonicalUrls  - User-chosen URLs (canonical form).
 *  @param {string}   args.articleId              - The owning Article _id.
 *  @param {(p: { url: string, status: "enriched" | "failed" }) => void} [args.onProgress]
 *      Optional progress callback invoked once per source after its
 *      enrichment completes (success or failure). Used by the controller
 *      to fan out `source-enrichment` wizard-stream chunks (Req 1.9).
 *      Skipped sources (re-enrichment content-hash matches) are NOT
 *      reported through this callback — Req 1.9 specifies completion
 *      events only. Errors thrown from the callback are caught and
 *      logged so a flaky publisher cannot disrupt enrichment progress.
 *
 *  @returns {Promise<{
 *    enrichedCount: number,
 *    skippedCount: number,
 *    failedCount: number,
 *    perSource: Array<{ url: string, status: "enriched" | "skipped" | "failed" }>,
 *    briefEnrichment: object | null,
 *  }>}
 *
 *  The function never throws on per-source errors — failures are isolated
 *  and logged. It MAY throw if `brief` or `articleId` is missing (a
 *  programming error in the caller).
 */
export const enrichSelectedSources = async ({
  brief,
  selectedCanonicalUrls,
  articleId,
  onProgress,
} = {}) => {
  if (!brief || !articleId) {
    throw new Error(
      "enrichSelectedSources requires { brief, articleId }; received missing argument"
    );
  }

  const summary = {
    enrichedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    perSource: [],
    briefEnrichment: null,
  };

  const selected = Array.isArray(selectedCanonicalUrls)
    ? selectedCanonicalUrls
    : [];
  if (selected.length === 0) {
    return summary;
  }

  // Build the brief allow-list once, used by every per-source shape check.
  const allowedUrlSet = buildAllowedUrlSet(brief);

  // Index brief sources by canonical URL for O(1) lookup.
  const sourcesByUrl = new Map();
  for (const s of brief.sources || []) {
    if (s.skipReason) continue;
    const canon = canonicalUrl(s.url || "");
    if (canon) sourcesByUrl.set(canon, s);
  }

  // Resolve the selection -> matching brief sources, in input order.
  // Sources not present in the brief (or marked skipped) are recorded as
  // "failed" so callers can surface a per-URL status if they wish.
  const work = [];
  for (const rawUrl of selected) {
    const canon = canonicalUrl(rawUrl || "");
    const source = canon ? sourcesByUrl.get(canon) : null;
    if (!source) {
      summary.failedCount += 1;
      summary.perSource.push({ url: canon || String(rawUrl || ""), status: "failed" });
      continue;
    }
    work.push({ canon, source });
  }

  // Re-enrichment skip (Requirement 1.13): if an existing enrichment
  // matches the current cleanedMarkdown content hash, skip the LLM call.
  const toEnrich = [];
  for (const item of work) {
    const currentHash =
      item.source.contentHash || sha256Hex(item.source.cleanedMarkdown || "");
    const existing = item.source.enrichment;
    if (existing && existing.contentHash === currentHash) {
      summary.skippedCount += 1;
      summary.perSource.push({ url: item.canon, status: "skipped" });
      continue;
    }
    toEnrich.push(item);
  }

  // Concurrency-bounded worker (Requirement 1.4: at most 8 in parallel).
  //
  // After each source completes (success or failure), we emit a
  // progress event to the optional `onProgress` callback so the
  // controller can fan out a `source-enrichment` wizard-stream chunk
  // per Requirement 1.9. Re-enrichment-skip results are NOT reported
  // here — Req 1.9 is scoped to completion events.
  const reportProgress = (url, status) => {
    if (typeof onProgress !== "function") return;
    try {
      const out = onProgress({ url, status });
      // Allow the callback to be async without blocking the worker —
      // we attach a defensive .catch() so a publisher failure cannot
      // surface as an unhandled rejection.
      if (out && typeof out.then === "function") {
        out.catch((err) => {
          logger.warn("[source-enrichment] onProgress callback rejected", {
            articleId,
            sourceUrl: url,
            message: err?.message,
          });
        });
      }
    } catch (err) {
      logger.warn("[source-enrichment] onProgress callback threw", {
        articleId,
        sourceUrl: url,
        message: err?.message,
      });
    }
  };

  const enrichments = await runWithConcurrency(
    toEnrich,
    async (item) => {
      const enrichment = await enrichOneSource({
        brief,
        source: item.source,
        allowedUrlSet,
        articleId,
      });
      if (!enrichment) {
        reportProgress(item.canon, "failed");
        return { canon: item.canon, status: "failed", enrichment: null };
      }
      // Persist this source's enrichment immediately. Atomic per source
      // so a sibling failure cannot corrupt this write.
      const ok = await persistSourceEnrichment({
        workspaceId: brief.workspaceId,
        articleId,
        sourceUrl: item.canon,
        enrichment,
      });
      const status = ok ? "enriched" : "failed";
      reportProgress(item.canon, status);
      return {
        canon: item.canon,
        status,
        enrichment: ok ? enrichment : null,
      };
    },
    MAX_PARALLEL
  );

  for (const res of enrichments) {
    if (!res) continue;
    if (res.status === "enriched") summary.enrichedCount += 1;
    else summary.failedCount += 1;
    summary.perSource.push({ url: res.canon, status: res.status });
  }

  // Brief-level aggregate from successful enrichments only.
  const successfulEnrichments = enrichments
    .filter((r) => r && r.status === "enriched")
    .map((r) => r.enrichment);

  if (successfulEnrichments.length > 0) {
    const briefEnrichment = await buildBriefAggregate({
      brief,
      perSourceEnrichments: successfulEnrichments,
      articleId,
    });
    await persistBriefAggregate({
      workspaceId: brief.workspaceId,
      articleId,
      briefEnrichment,
    });
    summary.briefEnrichment = briefEnrichment;
  }

  return summary;
};

/* ──────────────────────────────────────────────────────────
 *  Re-exported primitives (for unit / property tests in
 *  tasks 2.3, 2.4, 2.5 — kept internal-friendly so the test
 *  harness doesn't need to reach into private helpers).
 * ────────────────────────────────────────────────────────── */
export {
  PER_SOURCE_TIMEOUT_MS,
  MAX_PARALLEL,
  ENRICHMENT_TOOL_SCHEMA,
  BRIEF_AGGREGATE_TOOL_SCHEMA,
  buildAllowedUrlSet,
  shapeEnrichmentPayload,
  runWithConcurrency,
  withTimeout,
};

