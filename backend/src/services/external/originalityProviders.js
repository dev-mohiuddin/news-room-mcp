import { logger } from "#utils/logger.js";
import { OriginalityProviderError } from "#utils/pipelineErrors.js";

/**
 * ============================================================
 *  Originality providers — Requirement 7
 * ============================================================
 *
 *  Each adapter implements:  checkOriginality(text) → { score, providerName, raw, units }
 *
 *  - score is normalized to [0, 1]; higher = more similar to existing web content
 *  - units = provider-reported units consumed (for cost tracking)
 *
 *  Wrapper (originalityService.js) adds:
 *   - 30s per-request timeout
 *   - chunking at 20,000 chars; aggregate via arithmetic mean
 *   - 3 retries with exp backoff + jitter on HTTP 429
 *   - 1 retry on other errors before surfacing OriginalityProviderError
 *   - Provider selection via `ORIGINALITY_PROVIDER` env var
 *   - Threshold via `ORIGINALITY_THRESHOLD` (default 0.15)
 */

export const ORIGINALITY_PROVIDERS = ["originality_ai", "copyleaks"];

const REQUEST_TIMEOUT_MS = 30_000;

const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
};

/* ── Originality.ai adapter ───────────────────────────────── */

export const checkWithOriginalityAi = async (text) => {
  const apiKey = process.env.ORIGINALITY_AI_API_KEY;
  if (!apiKey) throw new OriginalityProviderError("ORIGINALITY_AI_API_KEY missing");

  const res = await fetchWithTimeout(
    "https://api.originality.ai/api/v1/scan/plagiarism",
    {
      method: "POST",
      headers: {
        "X-OAI-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        content: text,
        title: "newsroom-mcp-check",
        excludedUrls: [],
      }),
    }
  );
  if (res.status === 429) {
    const err = new OriginalityProviderError("Originality.ai rate limited");
    err.statusCode = 429;
    throw err;
  }
  if (!res.ok) {
    throw new OriginalityProviderError(
      `Originality.ai error ${res.status}`
    );
  }
  const data = await res.json();
  // The API returns "score" as 0-1 (higher = more plagiarized).
  const score = clamp01(
    data?.score ??
      data?.result?.score ??
      data?.plagiarism_score ??
      0
  );
  const units = data?.credits_used || 1;
  return {
    score,
    providerName: "originality_ai",
    raw: data,
    units,
  };
};

/* ── Copyleaks adapter (placeholder) ──────────────────────── */

export const checkWithCopyleaks = async (text) => {
  const email = process.env.COPYLEAKS_EMAIL;
  const apiKey = process.env.COPYLEAKS_API_KEY;
  if (!email || !apiKey) {
    throw new OriginalityProviderError("Copyleaks credentials missing");
  }

  // Step 1 — login to get a JWT.
  const loginRes = await fetchWithTimeout(
    "https://id.copyleaks.com/v3/account/login/api",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, key: apiKey }),
    }
  );
  if (!loginRes.ok) {
    throw new OriginalityProviderError("Copyleaks login failed");
  }
  const { access_token: token } = await loginRes.json();

  // Step 2 — submit a scan and poll for the result.
  // For MVP we use the synchronous "submit text" v3 endpoint and poll once
  // after a short delay; full async webhooks land in a later spec.
  const scanId = `nrm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const submit = await fetchWithTimeout(
    `https://api.copyleaks.com/v3/scans/submit/file/${scanId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64: Buffer.from(text, "utf-8").toString("base64"),
        filename: "article.txt",
        properties: {
          sandbox: false,
          webhooks: { status: "https://example.invalid/copyleaks" },
        },
      }),
    }
  );
  if (submit.status === 429) {
    const err = new OriginalityProviderError("Copyleaks rate limited");
    err.statusCode = 429;
    throw err;
  }
  if (!submit.ok) {
    throw new OriginalityProviderError(
      `Copyleaks scan submit failed: ${submit.status}`
    );
  }

  // Wait up to 25 s for completion (Copyleaks usually finishes well under that).
  const deadline = Date.now() + 25_000;
  let lastResult = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    const status = await fetchWithTimeout(
      `https://api.copyleaks.com/v3/scans/${scanId}/result`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (status.ok) {
      lastResult = await status.json();
      if (lastResult?.results?.score?.aggregatedScore !== undefined) break;
    }
  }
  if (!lastResult) {
    throw new OriginalityProviderError("Copyleaks scan did not complete in time");
  }
  const score = clamp01(
    (lastResult?.results?.score?.aggregatedScore || 0) / 100
  );
  return {
    score,
    providerName: "copyleaks",
    raw: lastResult,
    units: 1,
  };
};

/* ── Helpers ──────────────────────────────────────────────── */

const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return Math.min(n / 100, 1); // some APIs return 0-100
  return n;
};

/**
 * Provider selection + startup credential check (Requirement 7.4).
 * Call this once at process boot. Throws fatally on misconfiguration.
 */
export const assertOriginalityConfig = () => {
  const provider = (process.env.ORIGINALITY_PROVIDER || "originality_ai").toLowerCase();
  if (!ORIGINALITY_PROVIDERS.includes(provider)) {
    throw new Error(
      `ORIGINALITY_PROVIDER='${provider}' is invalid. Allowed: ${ORIGINALITY_PROVIDERS.join(", ")}`
    );
  }
  if (provider === "originality_ai" && !process.env.ORIGINALITY_AI_API_KEY) {
    // Soft warning in dev; hard fail in production.
    if (process.env.NODE_ENV === "production") {
      throw new Error("ORIGINALITY_AI_API_KEY is required when ORIGINALITY_PROVIDER=originality_ai");
    }
    logger.warn(
      "ORIGINALITY_AI_API_KEY missing — originality stage will be skipped in dev"
    );
  }
  if (
    provider === "copyleaks" &&
    (!process.env.COPYLEAKS_EMAIL || !process.env.COPYLEAKS_API_KEY)
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "COPYLEAKS_EMAIL and COPYLEAKS_API_KEY are required when ORIGINALITY_PROVIDER=copyleaks"
      );
    }
    logger.warn(
      "Copyleaks credentials missing — originality stage will be skipped in dev"
    );
  }
  return provider;
};

export const getProviderAdapter = () => {
  const provider = (process.env.ORIGINALITY_PROVIDER || "originality_ai").toLowerCase();
  if (provider === "copyleaks") return checkWithCopyleaks;
  return checkWithOriginalityAi;
};
