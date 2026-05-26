import {
  getProviderAdapter,
} from "#services/external/originalityProviders.js";
import { logger } from "#utils/logger.js";
import {
  htmlToPlain,
  tokenize,
  findVerbatimSpan,
  canonicalUrl,
} from "#utils/textUtil.js";
import { OriginalityProviderError } from "#utils/pipelineErrors.js";

/**
 * ============================================================
 *  Originality service — Requirement 6 + 7
 * ============================================================
 *
 *  Three independent checks must ALL pass before draft_ready:
 *    1. Provider score ≤ ORIGINALITY_THRESHOLD (default 0.15)
 *    2. Citation validator: every `factual` paragraph has ≥ 1 valid citation
 *    3. No 12-token verbatim span overlaps any source's cleaned markdown
 *
 *  Failure mapping:
 *    - score over threshold        → ORIGINALITY_THRESHOLD_EXCEEDED
 *    - missing citation in factual → MISSING_CITATIONS
 *    - verbatim span detected      → VERBATIM_COPY_DETECTED
 *    - provider error after retry  → ORIGINALITY_PROVIDER_ERROR
 *
 *  All of these (except provider error) → status `needs_revision`.
 *  3rd revision attempt → ORIGINALITY_RETRIES_EXHAUSTED (failed).
 */

const CHUNK_SIZE = 20_000;
const VERBATIM_SPAN = 12;
const SHORT_PARAGRAPH_THRESHOLD = 30; // tokens

const getThreshold = () => {
  const raw = process.env.ORIGINALITY_THRESHOLD;
  const n = parseFloat(raw);
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  return 0.15;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Provider call with retry/backoff ─────────────────────── */

const callProviderWithRetry = async (text) => {
  const adapter = getProviderAdapter();
  let lastErr = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await adapter(text);
    } catch (err) {
      lastErr = err;
      const is429 =
        err instanceof OriginalityProviderError && err.statusCode === 429;
      if (is429 && attempt < 3) {
        const delay = 1000 * 2 ** attempt + Math.floor(Math.random() * 500);
        logger.warn(`[originality] 429; retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      if (!is429 && attempt < 1) {
        logger.warn("[originality] provider error; one retry", {
          message: err.message,
        });
        continue;
      }
      break;
    }
  }
  throw lastErr ?? new OriginalityProviderError("Originality provider unavailable");
};

const chunkText = (text) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  return chunks.length ? chunks : [""];
};

const aggregateScore = async (text) => {
  const chunks = chunkText(text);
  let totalUnits = 0;
  let providerName = null;
  let scoreSum = 0;
  let firstRaw = null;

  for (const chunk of chunks) {
    const result = await callProviderWithRetry(chunk);
    scoreSum += result.score;
    totalUnits += result.units || 1;
    providerName = result.providerName;
    if (!firstRaw) firstRaw = result.raw;
  }
  return {
    score: chunks.length ? scoreSum / chunks.length : 0,
    units: totalUnits,
    providerName,
    raw: firstRaw,
  };
};

/* ── Citation + verbatim validators ───────────────────────── */

const validateCitations = ({ paragraphs, briefSourceUrls }) => {
  for (const p of paragraphs) {
    if (p.tag !== "factual") continue;
    const cs = p.citations || [];
    const valid = cs.find((c) => briefSourceUrls.has(canonicalUrl(c.url)));
    if (!valid) {
      return { ok: false, reason: "MISSING_CITATIONS", paragraphId: p.id };
    }
  }
  return { ok: true };
};

const detectVerbatim = ({ paragraphs, briefSources }) => {
  const flagged = [];

  for (const p of paragraphs) {
    const plain = htmlToPlain(p.html || "");
    const articleTokens = tokenize(plain);
    if (articleTokens.length < SHORT_PARAGRAPH_THRESHOLD) continue;

    for (const src of briefSources) {
      if (src.skipReason || !src.cleanedMarkdown) continue;
      const sourceTokens = tokenize(src.cleanedMarkdown);
      const span = findVerbatimSpan({
        articleTokens,
        sourceTokens,
        spanLength: VERBATIM_SPAN,
      });
      if (span) {
        flagged.push({
          sourceUrl: src.url,
          sourceStartChar: -1,
          sourceEndChar: -1,
          articleStartChar: -1,
          articleEndChar: -1,
          tokenCount: span.tokenCount,
        });
        break; // one flag per paragraph is enough
      }
    }
  }
  return flagged;
};

/* ── Public entry point ───────────────────────────────────── */

export const runOriginalityStage = async ({ article, brief }) => {
  const briefSources = (brief?.sources || []).filter((s) => !s.skipReason);
  const briefUrls = new Set(briefSources.map((s) => canonicalUrl(s.url)));

  // 1. Citation validator (deterministic; cheap; run first)
  const citationCheck = validateCitations({
    paragraphs: article.paragraphs || [],
    briefSourceUrls: briefUrls,
  });
  if (!citationCheck.ok) {
    return {
      ok: false,
      failureReason: "MISSING_CITATIONS",
      details: citationCheck,
      originalityRecord: {
        score: null,
        provider: null,
        checkedAt: new Date(),
        flaggedSpans: [],
      },
      cost: null,
    };
  }

  // 2. Verbatim span detector (deterministic)
  const flagged = detectVerbatim({
    paragraphs: article.paragraphs || [],
    briefSources,
  });
  if (flagged.length > 0) {
    return {
      ok: false,
      failureReason: "VERBATIM_COPY_DETECTED",
      details: { count: flagged.length },
      originalityRecord: {
        score: null,
        provider: null,
        checkedAt: new Date(),
        flaggedSpans: flagged,
      },
      cost: null,
    };
  }

  // 3. Provider score
  const plainText = (article.paragraphs || [])
    .map((p) => htmlToPlain(p.html || ""))
    .join("\n\n");

  // In dev, allow the originality call to be skipped if no key is configured.
  const providerName = (process.env.ORIGINALITY_PROVIDER || "originality_ai").toLowerCase();
  const credentialed =
    (providerName === "originality_ai" && process.env.ORIGINALITY_AI_API_KEY) ||
    (providerName === "copyleaks" &&
      process.env.COPYLEAKS_EMAIL &&
      process.env.COPYLEAKS_API_KEY);

  if (!credentialed && process.env.NODE_ENV !== "production") {
    logger.warn(
      "[originality] provider not configured in dev; passing originality gate with score=0"
    );
    return {
      ok: true,
      originalityRecord: {
        score: 0,
        provider: providerName,
        checkedAt: new Date(),
        flaggedSpans: [],
      },
      cost: null,
    };
  }

  let providerResult;
  try {
    providerResult = await aggregateScore(plainText);
  } catch (err) {
    return {
      ok: false,
      failureReason: "ORIGINALITY_PROVIDER_ERROR",
      details: { message: err.message },
      providerError: true,
      cost: null,
    };
  }

  const threshold = getThreshold();
  if (providerResult.score > threshold) {
    return {
      ok: false,
      failureReason: "ORIGINALITY_THRESHOLD_EXCEEDED",
      details: { score: providerResult.score, threshold },
      originalityRecord: {
        score: providerResult.score,
        provider: providerResult.providerName,
        checkedAt: new Date(),
        flaggedSpans: [],
      },
      cost: {
        stageName: "originality",
        providerName: providerResult.providerName,
        model: null,
        promptTokens: 0,
        completionTokens: 0,
        unitsConsumed: providerResult.units || 0,
        usdCost: 0,
        costFlagged: false,
        latencyMs: 0,
        ts: new Date(),
      },
    };
  }

  return {
    ok: true,
    originalityRecord: {
      score: providerResult.score,
      provider: providerResult.providerName,
      checkedAt: new Date(),
      flaggedSpans: [],
    },
    cost: {
      stageName: "originality",
      providerName: providerResult.providerName,
      model: null,
      promptTokens: 0,
      completionTokens: 0,
      unitsConsumed: providerResult.units || 0,
      usdCost: 0,
      costFlagged: false,
      latencyMs: 0,
      ts: new Date(),
    },
  };
};
