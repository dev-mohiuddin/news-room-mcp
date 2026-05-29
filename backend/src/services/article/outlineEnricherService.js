import { generateText, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import { canonicalUrl } from "#utils/textUtil.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Outline Enricher — Requirement 2 (2.3, 2.6)
 * ============================================================
 *
 *  When the user "recharges" an outline, this service runs a small
 *  Haiku pass that produces fresh micro-context the outline LLM can
 *  use to differentiate the regenerated outline from the previous
 *  attempt: extra angles, suggested links restricted to the brief's
 *  source set, contrasting fact pairs, and an audience hook.
 *
 *  Public surface:
 *    prepareOutlineContext({ brief, article })
 *      -> {
 *           extraAngles:   string[3..5]   (each <= 20 words)
 *           suggestedLinks:{ url, anchorHint }[3..5]  (urls restricted
 *                                                     to brief sources
 *                                                     by canonicalUrl)
 *           contrastFacts: { factA, factB, sourceUrls }[2]   (exactly 2)
 *           audienceHook:  string         (exactly 1, <= 30 words)
 *           generatedAt:   Date
 *         }
 *      | null  (on any failure: timeout, network/rate-limit error,
 *               shape violation, source-allowlist violation)
 *
 *  Failure mode (Requirement 2.6): on any error, log a warning with
 *  context and return null so the caller can run the existing outline
 *  prompt path verbatim. This service never throws.
 *
 *  This module performs no persistence — the caller is responsible
 *  for writing the result onto Article.outlineContext (Task 10.1).
 */

/* ── Configuration ─────────────────────────────────────────── */

const HAIKU_TIMEOUT_MS = 8_000;

const ANGLES_MIN = 3;
const ANGLES_MAX = 5;
const ANGLE_MAX_WORDS = 20;

const LINKS_MIN = 3;
const LINKS_MAX = 5;
const ANCHOR_HINT_MAX_CHARS = 120;

const CONTRAST_PAIRS_REQUIRED = 2;
const HOOK_MAX_WORDS = 30;

/* ── Helpers ───────────────────────────────────────────────── */

const countWords = (str) =>
  String(str || "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

const trimToSentence = (str) => String(str || "").trim();

/**
 * Build the canonical URL set for the brief's persisted sources. Used to
 * restrict suggestedLinks and contrastFacts.sourceUrls to URLs the brief
 * actually carries (Requirement 2.3).
 */
const buildSourceUrlMap = (brief) => {
  const map = new Map(); // canonical -> original (first-seen) for resolution
  const sources = Array.isArray(brief?.sources) ? brief.sources : [];
  for (const src of sources) {
    if (!src || src.skipReason) continue;
    const raw = src.url || src.originalUrl || "";
    if (!raw) continue;
    const canon = canonicalUrl(raw);
    if (!canon) continue;
    if (!map.has(canon)) map.set(canon, raw);
  }
  return map;
};

const briefHasUrl = (canonicalSet, url) =>
  canonicalSet.has(canonicalUrl(url || ""));

/* ── Prompt construction ──────────────────────────────────── */

const buildPrompt = ({ brief, article }) => {
  const topic = brief?.topic || article?.topic || "";
  const targetKeyword = brief?.targetKeyword || article?.targetKeyword || "";

  const bullets = (brief?.summaryBullets || [])
    .map((b, i) => `${i + 1}. ${b.text || ""}`)
    .filter((s) => s.trim().length > 3)
    .join("\n");

  // Source list — restrict the model to citing these URLs by canonical form.
  const usableSources = (brief?.sources || []).filter((s) => s && !s.skipReason);
  const sourceList = usableSources
    .map((s, i) => {
      const canon = canonicalUrl(s.url || s.originalUrl || "");
      return `[${i + 1}] ${s.title || canon}\n${canon}`;
    })
    .join("\n");

  const previousOutline = (article?.outline || [])
    .map((s, i) => `${i + 1}. ${s.heading}`)
    .join("\n");

  const previousAngles = (article?.outlineContext?.extraAngles || [])
    .map((a, i) => `${i + 1}. ${a}`)
    .join("\n");

  return [
    `Topic: ${topic}`,
    `Target keyword: ${targetKeyword}`,
    "",
    "Research bullets:",
    bullets || "(none)",
    "",
    "Brief sources (use only these URLs verbatim — do not invent or modify):",
    sourceList || "(none)",
    "",
    "Previous outline (avoid duplicating these angles):",
    previousOutline || "(none — first regenerate)",
    "",
    "Previously-generated angles (avoid repeating):",
    previousAngles || "(none)",
    "",
    "Produce a JSON object with EXACTLY these keys (no extra keys, no prose, no markdown fences):",
    "{",
    `  "extraAngles": [${ANGLES_MIN}-${ANGLES_MAX} short angle strings, each <= ${ANGLE_MAX_WORDS} words],`,
    `  "suggestedLinks": [${LINKS_MIN}-${LINKS_MAX} objects of shape { "url": "<one of the brief sources verbatim>", "anchorHint": "<= ${ANCHOR_HINT_MAX_CHARS} chars" }],`,
    `  "contrastFacts": [exactly ${CONTRAST_PAIRS_REQUIRED} objects of shape { "factA": "...", "factB": "...", "sourceUrls": ["<one or more brief source URLs verbatim>"] }],`,
    `  "audienceHook": "<one sentence, <= ${HOOK_MAX_WORDS} words, addressing the reader>"`,
    "}",
    "",
    "Output ONLY the JSON object. Do not wrap it in markdown fences or commentary.",
  ].join("\n");
};

/* ── Response parsing ─────────────────────────────────────── */

/**
 * Extract the first balanced JSON object from arbitrary LLM output.
 * Tolerates surrounding prose or markdown fences.
 */
const extractJsonObject = (text) => {
  if (!text || typeof text !== "string") return null;
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

/* ── Shape validation & normalization ─────────────────────── */

/**
 * Validate the parsed payload against the bounds in Requirement 2.3
 * and the source-allowlist invariant in Requirement 2.3 (links restricted
 * to brief sources by canonicalUrl). Returns a normalized object on
 * success or null on any violation.
 */
const validateAndNormalize = (parsed, sourceMap) => {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "not_object" };
  }

  /* extraAngles: 3–5 strings, each <= 20 words */
  const rawAngles = Array.isArray(parsed.extraAngles) ? parsed.extraAngles : [];
  const angles = rawAngles
    .filter(isNonEmptyString)
    .map(trimToSentence)
    .filter((a) => countWords(a) <= ANGLE_MAX_WORDS);
  if (angles.length < ANGLES_MIN || angles.length > ANGLES_MAX) {
    return { ok: false, reason: "extraAngles_out_of_range", count: angles.length };
  }

  /* suggestedLinks: 3–5 { url, anchorHint }, urls restricted to brief sources */
  const rawLinks = Array.isArray(parsed.suggestedLinks) ? parsed.suggestedLinks : [];
  const links = [];
  const seenLinkCanon = new Set();
  for (const item of rawLinks) {
    if (!item || typeof item !== "object") continue;
    const url = isNonEmptyString(item.url) ? item.url.trim() : null;
    if (!url) continue;
    const canon = canonicalUrl(url);
    if (!canon || !sourceMap.has(canon)) continue; // allowlist enforcement
    if (seenLinkCanon.has(canon)) continue;
    seenLinkCanon.add(canon);
    const anchorHintRaw = isNonEmptyString(item.anchorHint)
      ? item.anchorHint.trim()
      : "";
    const anchorHint = anchorHintRaw.slice(0, ANCHOR_HINT_MAX_CHARS);
    links.push({ url: canon, anchorHint });
  }
  if (links.length < LINKS_MIN || links.length > LINKS_MAX) {
    return { ok: false, reason: "suggestedLinks_out_of_range", count: links.length };
  }

  /* contrastFacts: exactly 2 pairs, sourceUrls restricted to brief sources */
  const rawContrast = Array.isArray(parsed.contrastFacts) ? parsed.contrastFacts : [];
  const contrastFacts = [];
  for (const item of rawContrast) {
    if (!item || typeof item !== "object") continue;
    const factA = isNonEmptyString(item.factA) ? item.factA.trim() : null;
    const factB = isNonEmptyString(item.factB) ? item.factB.trim() : null;
    if (!factA || !factB) continue;
    const rawSourceUrls = Array.isArray(item.sourceUrls) ? item.sourceUrls : [];
    const sourceUrls = [];
    const seen = new Set();
    for (const u of rawSourceUrls) {
      if (!isNonEmptyString(u)) continue;
      const canon = canonicalUrl(u);
      if (!canon || !sourceMap.has(canon) || seen.has(canon)) continue;
      seen.add(canon);
      sourceUrls.push(canon);
    }
    contrastFacts.push({ factA, factB, sourceUrls });
    if (contrastFacts.length === CONTRAST_PAIRS_REQUIRED) break;
  }
  if (contrastFacts.length !== CONTRAST_PAIRS_REQUIRED) {
    return {
      ok: false,
      reason: "contrastFacts_wrong_count",
      count: contrastFacts.length,
    };
  }

  /* audienceHook: exactly 1 string, <= 30 words */
  const hookRaw = parsed.audienceHook;
  if (!isNonEmptyString(hookRaw)) {
    return { ok: false, reason: "audienceHook_missing" };
  }
  const audienceHook = hookRaw.trim();
  if (countWords(audienceHook) > HOOK_MAX_WORDS) {
    return { ok: false, reason: "audienceHook_too_long" };
  }

  return {
    ok: true,
    value: {
      extraAngles: angles,
      suggestedLinks: links,
      contrastFacts,
      audienceHook,
    },
  };
};

/* ── Timeout wrapper ──────────────────────────────────────── */

const withTimeout = (promise, ms, label) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.code = "OUTLINE_ENRICHER_TIMEOUT";
      reject(err);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });

/* ── Public entry point ───────────────────────────────────── */

/**
 * Generate fresh outline-recharge context. Returns null on any failure
 * so the caller can fall through to the existing outline prompt path.
 *
 * @param {object} args
 * @param {object} args.brief    The persisted ResearchBrief document.
 * @param {object} args.article  The Article document being recharged.
 * @returns {Promise<null | {
 *   extraAngles: string[],
 *   suggestedLinks: { url: string, anchorHint: string }[],
 *   contrastFacts: { factA: string, factB: string, sourceUrls: string[] }[],
 *   audienceHook: string,
 *   generatedAt: Date
 * }>}
 */
export const prepareOutlineContext = async ({ brief, article } = {}) => {
  const articleId = article?._id?.toString?.() || article?.id || null;

  const sourceMap = buildSourceUrlMap(brief);
  if (sourceMap.size < LINKS_MIN) {
    // Cannot satisfy the 3–5 suggestedLinks bound from the brief's source set.
    logger.warn("[outline-enricher] insufficient brief sources for enrichment", {
      articleId,
      briefSourceCount: sourceMap.size,
      requiredMin: LINKS_MIN,
    });
    return null;
  }

  let llmResult;
  try {
    llmResult = await withTimeout(
      generateText({
        model: HAIKU_MODEL,
        system:
          "You are an outline-recharge assistant for a newsroom article wizard. " +
          "You produce JSON only — no prose, no markdown fences. " +
          "You only cite URLs from the provided brief source list, copied verbatim.",
        prompt: buildPrompt({ brief, article }),
        maxTokens: 1024,
        temperature: 0.6,
      }),
      HAIKU_TIMEOUT_MS,
      "outline-enricher Haiku call"
    );
  } catch (err) {
    logger.warn("[outline-enricher] Haiku call failed", {
      articleId,
      message: err?.message,
      code: err?.code || null,
    });
    return null;
  }

  const parsed = extractJsonObject(llmResult?.text);
  if (!parsed) {
    logger.warn("[outline-enricher] could not parse JSON from Haiku response", {
      articleId,
    });
    return null;
  }

  const validation = validateAndNormalize(parsed, sourceMap);
  if (!validation.ok) {
    logger.warn("[outline-enricher] payload failed shape check", {
      articleId,
      reason: validation.reason,
      count: validation.count,
    });
    return null;
  }

  return {
    ...validation.value,
    generatedAt: new Date(),
  };
};
