import { useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import { findExistingSlug } from "#repositories/articleRepository.js";
import {
  SEO_SPECIALIST_PERSONA,
  composeSystemPrompt,
} from "#services/article/personas/loader.js";
import { logger } from "#utils/logger.js";
import { isFlagEnabled } from "#utils/featureFlags.js";
import {
  classifyError,
  compareErrors,
  canonicalizeFaqUrls,
  rebalanceFaqAnswerLength,
  dedupeTags,
  slugFallbackToTargetKeyword,
  levenshteinSubstituteKeyword,
} from "#services/article/seoValidationCategories.js";
import { canonicalUrl } from "#utils/textUtil.js";

/**
 * ============================================================
 *  SEO stage — Requirement 5
 * ============================================================
 *
 *   - 3 meta titles (30–60 chars), keyword in ≥ 1
 *   - 1 meta description (1–160 chars), keyword exactly once (case-insensitive)
 *   - URL slug: lowercased, alnum + hyphens, ≤ 75 chars; uniquify with -2, -3 …
 *   - FAQ ≥ 3 pairs (q 50–120, a 100–300, ≥ 1 source URL each)
 *   - 3–10 lowercase tags (alnum + hyphens)
 *   - OG title/description/image placeholder
 *   - 2 retries before SEO_VALIDATION_FAILED
 *
 *  When `HLP_SEO_HARDEN_ENABLED` is true, the validator gains:
 *   - Canonical-URL comparison for FAQ citations (Req 5.1, 5.2 / Property 8).
 *   - Post-validation FAQ-answer length rebalancing with up to 3 inline
 *     re-validation iterations, all counted as one retry (Req 5.3, 5.4, 5.8 /
 *     Property 9).
 *   - Tag deduplication and slug fallback before validation (Req 5.8).
 *   - Levenshtein keyword substitution into meta titles (Req 5.6).
 *   - Per-error retry hint built from the single highest-severity rule
 *     (fatal-first, then lexicographic) via `compareErrors` (Req 5.5).
 *
 *  When the flag is false, the function is byte-identical to the pre-feature
 *  codebase (Req 5.15 / Property 12).
 */

const SEO_TOOL_SCHEMA = {
  type: "object",
  properties: {
    metaTitleOptions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string", minLength: 30, maxLength: 60 },
    },
    metaDescription: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: "string", minLength: 1, maxLength: 75 },
    faq: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          question: { type: "string", minLength: 50, maxLength: 120 },
          answer: { type: "string", minLength: 100, maxLength: 300 },
          citationUrls: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
        },
        required: ["question", "answer", "citationUrls"],
      },
    },
    tags: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: { type: "string", minLength: 2, maxLength: 40 },
    },
    ogTitle: { type: "string", minLength: 5, maxLength: 90 },
    ogDescription: { type: "string", minLength: 30, maxLength: 200 },
  },
  required: [
    "metaTitleOptions",
    "metaDescription",
    "slug",
    "faq",
    "tags",
    "ogTitle",
    "ogDescription",
  ],
};

const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 75);

const containsKeyword = (str, keyword) =>
  String(str).toLowerCase().includes(String(keyword).toLowerCase());

const countOccurrences = (str, keyword) => {
  const k = String(keyword).toLowerCase();
  if (!k) return 0;
  const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  return ((String(str).toLowerCase()).match(re) || []).length;
};

const normalizeTag = (tag = "") =>
  String(tag)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/**
 * Clamp lengths to fit our SEO guardrails before validation. Models can
 * miss minimums by a few characters; rather than throw away the whole
 * bundle and pay for another full retry, we top up FAQ answers with a
 * neutral filler sentence and trim anything that overshoots.
 */
const padMin = (str, minLen) => {
  const s = String(str || "").trim();
  if (s.length >= minLen) return s;
  const filler =
    " This guidance reflects the source material referenced above and is intended to help readers act on the topic.";
  let out = s;
  while (out.length < minLen) {
    out = `${out}${filler}`.trim();
  }
  return out.slice(0, minLen + 60);
};

const clampMax = (str, maxLen) => {
  const s = String(str || "").trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).replace(/\s+\S*$/, "").trim();
};

const normalizeFaqEntry = (entry) => {
  if (!entry || typeof entry !== "object") return entry;
  return {
    ...entry,
    question: clampMax(padMin(entry.question, 50), 120),
    answer: clampMax(padMin(entry.answer, 100), 300),
    citationUrls: Array.isArray(entry.citationUrls) ? entry.citationUrls : [],
  };
};

/**
 * Variant of `normalizeFaqEntry` used when `HLP_SEO_HARDEN_ENABLED` is true.
 * Question length is still clamped pre-validation (cheap, never overshoots),
 * but the answer is left UNTOUCHED so `validateSeo` can flag drift and the
 * post-validation `rebalanceFaqAnswerLength` helper can apply a cap-aware
 * fix and re-validate inline (Req 5.3, 5.4 / Property 9).
 */
const normalizeFaqEntryHardened = (entry) => {
  if (!entry || typeof entry !== "object") return entry;
  return {
    ...entry,
    question: clampMax(padMin(entry.question, 50), 120),
    answer: typeof entry.answer === "string" ? entry.answer : String(entry.answer ?? ""),
    citationUrls: Array.isArray(entry.citationUrls) ? entry.citationUrls : [],
  };
};

const normalizeMetaTitle = (str) => clampMax(padMin(str, 30), 60);

const normalizeSeoPayload = (payload) => {
  const next = { ...payload };
  if (Array.isArray(next.metaTitleOptions)) {
    next.metaTitleOptions = next.metaTitleOptions.map(normalizeMetaTitle);
  }
  if (next.metaDescription) {
    next.metaDescription = clampMax(next.metaDescription, 160);
  }
  if (next.ogTitle) next.ogTitle = clampMax(padMin(next.ogTitle, 5), 90);
  if (next.ogDescription) {
    next.ogDescription = clampMax(padMin(next.ogDescription, 30), 200);
  }
  if (Array.isArray(next.faq)) {
    next.faq = next.faq.map(normalizeFaqEntry);
  }
  return next;
};

/**
 * Hardened variant of `normalizeSeoPayload`. Identical to the legacy version
 * except FAQ-answer length normalization is deferred to a post-validation
 * auto-correct pass (`rebalanceFaqAnswerLength`) so we only pad/clamp when
 * validation actually flagged a drift — eliminating the case where pre-
 * validation padding pushes an answer above the 300-char ceiling.
 */
const normalizeSeoPayloadHardened = (payload) => {
  const next = { ...payload };
  if (Array.isArray(next.metaTitleOptions)) {
    next.metaTitleOptions = next.metaTitleOptions.map(normalizeMetaTitle);
  }
  if (next.metaDescription) {
    next.metaDescription = clampMax(next.metaDescription, 160);
  }
  if (next.ogTitle) next.ogTitle = clampMax(padMin(next.ogTitle, 5), 90);
  if (next.ogDescription) {
    next.ogDescription = clampMax(padMin(next.ogDescription, 30), 200);
  }
  if (Array.isArray(next.faq)) {
    next.faq = next.faq.map(normalizeFaqEntryHardened);
  }
  return next;
};

const validateSeo = ({ payload, targetKeyword, briefUrls }) => {
  const errors = [];
  if (!payload.metaTitleOptions || payload.metaTitleOptions.length !== 3) {
    errors.push("metaTitleOptions must have exactly 3 entries");
  } else {
    const lengthsOk = payload.metaTitleOptions.every(
      (t) => typeof t === "string" && t.length >= 30 && t.length <= 60
    );
    if (!lengthsOk) errors.push("metaTitleOptions length out of range");
    const hasKeyword = payload.metaTitleOptions.some((t) =>
      containsKeyword(t, targetKeyword)
    );
    if (!hasKeyword) errors.push("no meta title contains target keyword");
  }
  if (
    !payload.metaDescription ||
    payload.metaDescription.length < 1 ||
    payload.metaDescription.length > 160
  ) {
    errors.push("metaDescription length out of range");
  } else if (countOccurrences(payload.metaDescription, targetKeyword) !== 1) {
    errors.push("metaDescription must contain target keyword exactly once");
  }
  if (!payload.slug || payload.slug.length > 75) {
    errors.push("slug missing or too long");
  }
  if (!Array.isArray(payload.faq) || payload.faq.length < 3) {
    errors.push("FAQ must have at least 3 pairs");
  } else {
    for (const f of payload.faq) {
      if (!f.question || f.question.length < 50 || f.question.length > 120) {
        errors.push("FAQ question length out of range");
      }
      if (!f.answer || f.answer.length < 100 || f.answer.length > 300) {
        errors.push("FAQ answer length out of range");
      }
      if (
        !Array.isArray(f.citationUrls) ||
        f.citationUrls.length < 1 ||
        !f.citationUrls.every((u) => briefUrls.has(u))
      ) {
        errors.push("FAQ pair missing valid citation URL");
      }
    }
  }
  if (!Array.isArray(payload.tags) || payload.tags.length < 3) {
    errors.push("tags must have at least 3 entries");
  }
  return { ok: errors.length === 0, errors };
};

const ensureUniqueSlug = async ({ workspaceId, baseSlug }) => {
  let candidate = baseSlug.slice(0, 75);
  let suffix = 2;
  // Cap at a handful of attempts; further collisions are vanishingly rare.
  for (let i = 0; i < 50; i++) {
    const existing = await findExistingSlug(workspaceId, candidate);
    if (!existing) return candidate;
    const suffixStr = `-${suffix++}`;
    const trimmed = baseSlug.slice(0, 75 - suffixStr.length);
    candidate = `${trimmed}${suffixStr}`;
  }
  // Last resort — append timestamp
  return `${baseSlug.slice(0, 60)}-${Date.now()}`.slice(0, 75);
};

/**
 * Build the canonical-form companion to a raw brief-URL set so the FAQ
 * citation check can compare canonical-vs-canonical (Req 5.1, 5.2).
 */
const canonicalizeBriefUrlSet = (briefUrls) => {
  const out = new Set();
  for (const u of briefUrls) {
    const c = canonicalUrl(u);
    if (c) out.add(c);
  }
  return out;
};

/**
 * Translate a single rule string into a focused, action-oriented retry hint.
 * Req 5.5: send exactly one focused instruction per attempt rather than the
 * concatenated string of every error.
 */
const buildRetryHintForRule = (rule, { targetKeyword } = {}) => {
  switch (rule) {
    case "metaTitleOptions must have exactly 3 entries":
      return "Return EXACTLY 3 entries in metaTitleOptions — no more, no fewer.";
    case "metaTitleOptions length out of range":
      return "Each meta title must be between 30 and 60 characters; count carefully before submitting.";
    case "no meta title contains target keyword":
      return `At least one of the three meta titles must contain the exact target keyword "${targetKeyword}".`;
    case "metaDescription length out of range":
      return "metaDescription must be between 1 and 160 characters.";
    case "metaDescription must contain target keyword exactly once":
      return `metaDescription must contain the target keyword "${targetKeyword}" EXACTLY ONCE (case-insensitive).`;
    case "slug missing or too long":
      return "slug must be a non-empty string of lowercase alphanumerics and hyphens, ≤ 75 characters.";
    case "FAQ must have at least 3 pairs":
      return "FAQ array must contain at least 3 question/answer pairs.";
    case "FAQ question length out of range":
      return "Each FAQ question must be between 50 and 120 characters.";
    case "FAQ answer length out of range":
      return "Each FAQ answer must be between 100 and 300 characters — write 2-3 full sentences.";
    case "FAQ pair missing valid citation URL":
      return "Every FAQ pair must include at least one citationUrl drawn from the supplied source list (allowed citation URLs).";
    case "tags must have at least 3 entries":
      return "Return at least 3 distinct lowercase tags (alphanumerics + hyphens only).";
    default:
      return rule;
  }
};

/**
 * Pick the single highest-severity validation error per attempt and translate
 * it into a focused retry hint string. Severity order (Req 5.5):
 *   1. fatal-class errors before recoverable
 *   2. lexicographic on rule name within the same class
 */
const pickFocusedRetryHint = (errors, { targetKeyword }) => {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  // Deduplicate identical rule strings so repeated failures (e.g. several FAQ
  // pairs all flagging "FAQ answer length out of range") collapse into one
  // hint rather than three.
  const seen = new Set();
  const ranked = [];
  for (const rule of errors) {
    if (typeof rule !== "string" || seen.has(rule)) continue;
    seen.add(rule);
    ranked.push({ rule, severity: classifyError(rule) });
  }
  if (ranked.length === 0) return null;
  ranked.sort(compareErrors);
  return buildRetryHintForRule(ranked[0].rule, { targetKeyword });
};

/**
 * Classify a thrown transport-layer error as either "transient" (network /
 * timeout / rate-limit) or "validation" (everything else, including JSON
 * parsing or schema-shape errors that surface as exceptions).
 *
 * Used only when `HLP_SEO_HARDEN_ENABLED` is true (Req 5.9). Transient
 * errors get up to MAX_TRANSIENT_RETRIES extra attempts inside the same
 * "attempt slot" before counting against the 3-attempt validation budget.
 */
const classifyTransportError = (err) => {
  if (!err) return "validation";
  const code = typeof err.code === "string" ? err.code : "";
  const status = typeof err.status === "number" ? err.status : null;
  const message = typeof err.message === "string" ? err.message : "";

  if (/^E(TIMEDOUT|CONNRESET|CONNREFUSED|NOTFOUND|HOSTUNREACH)$/.test(code)) {
    return "transient";
  }
  if (code === "ENRICHMENT_TIMEOUT") return "transient";
  if (status !== null && [408, 429, 500, 502, 503, 504].includes(status)) {
    return "transient";
  }
  if (/timeout|rate.?limit|network error|ECONN|ETIMEDOUT/i.test(message)) {
    return "transient";
  }
  return "validation";
};

/**
 * Redact a value before emitting to logs. Used by the per-attempt telemetry
 * line (Req 5.14): replace strings longer than 60 chars (assumed to be body
 * text or long FAQ answers), values containing email addresses, or values
 * containing phone numbers with the literal "[REDACTED]". Non-strings pass
 * through untouched.
 */
const redactForTelemetry = (value) => {
  if (typeof value !== "string") return value;
  if (value.length > 60) return "[REDACTED]";
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(value)) return "[REDACTED]";
  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(value)) return "[REDACTED]";
  if (/\b\+?\d{10,15}\b/.test(value)) return "[REDACTED]";
  return value;
};

/**
 * Extract the `actual` value associated with a single validation rule, used
 * to populate `details.perAttempt[].validationErrors[].actual` (Req 5.10).
 * Returns null when the rule is not length-or-citation related, or when the
 * payload doesn't contain a clearly identifiable offender.
 */
const extractActual = (rule, payload) => {
  if (!payload || typeof payload !== "object") return null;
  switch (rule) {
    case "FAQ answer length out of range": {
      const faq = Array.isArray(payload.faq) ? payload.faq : [];
      for (const f of faq) {
        const ans = typeof f?.answer === "string" ? f.answer : "";
        if (ans.length < 100 || ans.length > 300) return ans.length;
      }
      return null;
    }
    case "FAQ question length out of range": {
      const faq = Array.isArray(payload.faq) ? payload.faq : [];
      for (const f of faq) {
        const q = typeof f?.question === "string" ? f.question : "";
        if (q.length < 50 || q.length > 120) return q.length;
      }
      return null;
    }
    case "metaDescription length out of range":
      return typeof payload.metaDescription === "string"
        ? payload.metaDescription.length
        : null;
    case "metaTitleOptions length out of range": {
      const titles = Array.isArray(payload.metaTitleOptions)
        ? payload.metaTitleOptions
        : [];
      for (const t of titles) {
        const len = typeof t === "string" ? t.length : 0;
        if (len < 30 || len > 60) return len;
      }
      return null;
    }
    case "FAQ pair missing valid citation URL":
      return "no valid citation URL";
    default:
      return null;
  }
};

/**
 * The acceptable shape/range for a given validation rule, used to populate
 * `details.perAttempt[].validationErrors[].expected` (Req 5.10). Non-length
 * rules fall back to echoing the rule string itself.
 */
const expectedFor = (rule) => {
  switch (rule) {
    case "FAQ answer length out of range":
      return "100..300";
    case "metaDescription length out of range":
      return "1..160";
    case "metaTitleOptions length out of range":
      return "30..60";
    case "FAQ question length out of range":
      return "50..120";
    case "FAQ pair missing valid citation URL":
      return "URL from brief source list";
    default:
      return rule;
  }
};

/**
 * Apply rebalanceFaqAnswerLength to any FAQ answer outside the [100,300]
 * window. Returns a new payload (and a boolean indicating whether anything
 * actually changed, for inline-loop convergence detection).
 */
const applyFaqAnswerRebalance = (payload) => {
  if (!Array.isArray(payload.faq)) return { payload, changed: false };
  let changed = false;
  const nextFaq = payload.faq.map((f) => {
    if (!f || typeof f !== "object") return f;
    const ans = typeof f.answer === "string" ? f.answer : String(f.answer ?? "");
    if (ans.length >= 100 && ans.length <= 300) return f;
    const rebalanced = rebalanceFaqAnswerLength(ans);
    if (rebalanced === ans) return f;
    changed = true;
    return { ...f, answer: rebalanced };
  });
  if (!changed) return { payload, changed: false };
  return { payload: { ...payload, faq: nextFaq }, changed: true };
};

/**
 * Run the hardened auto-correct + inline re-validate loop for a single
 * attempt. Up to 3 iterations are allowed and ALL count as one retry.
 *
 * Per the design (Req 5.8):
 *   - "FAQ answer length out of range" → rebalanceFaqAnswerLength on the
 *     offending answers, then re-validate.
 *   - "no meta title contains target keyword" → levenshteinSubstituteKeyword
 *     (≤ 3 edit distance) on the title set, then re-validate.
 *
 * Other recoverable rules (length drift in titles/description, slug issues,
 * citation drift) are not auto-correctable beyond what already runs in the
 * pre-validation pass; for those the loop simply terminates and we send a
 * focused retry hint to the LLM next attempt.
 */
const runInlineAutoCorrect = ({
  payload,
  targetKeyword,
  canonicalBriefUrls,
  initialValidation,
}) => {
  let current = payload;
  let validation = initialValidation;
  const MAX_ITERATIONS = 3;

  for (let i = 0; i < MAX_ITERATIONS && !validation.ok; i++) {
    const errSet = new Set(validation.errors);
    let mutated = false;

    if (errSet.has("FAQ answer length out of range")) {
      const rebalanced = applyFaqAnswerRebalance(current);
      if (rebalanced.changed) {
        current = rebalanced.payload;
        mutated = true;
      }
    }

    if (errSet.has("no meta title contains target keyword")) {
      const nextTitles = levenshteinSubstituteKeyword(
        current.metaTitleOptions,
        targetKeyword,
        3
      );
      if (
        Array.isArray(nextTitles) &&
        Array.isArray(current.metaTitleOptions) &&
        nextTitles.some((t, idx) => t !== current.metaTitleOptions[idx])
      ) {
        current = { ...current, metaTitleOptions: nextTitles };
        mutated = true;
      }
    }

    if (!mutated) break; // no auto-correct could help — stop iterating

    validation = validateSeo({
      payload: current,
      targetKeyword,
      briefUrls: canonicalBriefUrls,
    });
  }

  return { payload: current, validation };
};

export const runSeoStage = async ({
  workspaceId,
  articleId,
  topic,
  targetKeyword,
  contentMarkdown,
  brief,
}) => {
  const briefUrls = new Set(
    (brief?.sources || []).filter((s) => !s.skipReason).map((s) => s.url)
  );
  const briefUrlsList = Array.from(briefUrls);

  // Re-evaluate the flag at the start of each invocation (no caching) so an
  // operator can flip `HLP_SEO_HARDEN_ENABLED` at runtime and the next stage
  // run picks it up (Req 6.9 / featureFlags.js semantics).
  const hardenEnabled = isFlagEnabled("HLP_SEO_HARDEN_ENABLED");

  const buildPrompt = (retryHint) =>
    [
      `Topic: ${topic}`,
      `Target keyword: ${targetKeyword}`,
      "",
      "Article (markdown, truncated):",
      String(contentMarkdown || "").slice(0, 6000),
      "",
      "Allowed citation URLs for FAQ:",
      briefUrlsList.join("\n") || "(none)",
      "",
      "Produce SEO assets via the submit_seo tool:",
      "- 3 meta titles, each between 30 and 60 characters (count carefully); at least one must contain the target keyword.",
      "- 1 meta description, between 1 and 160 characters, containing the target keyword EXACTLY ONCE (case-insensitive).",
      "- A URL slug derived from the target keyword: lowercase, alphanumeric + hyphens only, ≤ 75 chars.",
      "- FAQ array with 3-8 pairs. Each `question` MUST be between 50 and 120 characters (count the characters before submitting). Each `answer` MUST be between 100 and 300 characters — write 2-3 full sentences so you clear the 100-character minimum. Each FAQ pair must include at least one citation URL drawn from the list above.",
      "- 3-10 lowercase tags (alphanumeric + hyphens only).",
      "- ogTitle, ogDescription. Do NOT generate ogImage; we'll fill it server-side.",
      retryHint ? `\nRetry hint: ${retryHint}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  let lastErrors = null;
  let lastRetryHint = null;
  let aggregateUsd = 0;
  let aggregateLatency = 0;
  let lastModel = HAIKU_MODEL;
  let lastUsage = { promptTokens: 0, completionTokens: 0 };

  // Per-attempt telemetry / details accumulators (Req 5.10, 5.11, 5.13).
  // These are populated only when `hardenEnabled` is true so flag-off
  // behavior remains byte-identical to the pre-feature codebase.
  const perAttempt = [];
  let lastPayloadSnapshot = null;

  let attempt = 0;
  let transientRetries = 0;
  const MAX_TRANSIENT_RETRIES = 2;

  while (attempt < 3) {
    try {
      const result = await useTool({
        model: HAIKU_MODEL,
        system: composeSystemPrompt(SEO_SPECIALIST_PERSONA, [
          "RUNTIME CONSTRAINTS:",
          `- Target keyword: "${targetKeyword}"`,
          "- Submit one bundle via submit_seo. Do not include ogImage.",
          "- All FAQ citationUrls MUST come from the supplied source list.",
        ]),
        prompt: buildPrompt(
          // When the hardened path is on, we pre-built a single focused hint
          // (`lastRetryHint`). When off, preserve the legacy concatenated
          // string so flag-off behavior stays byte-identical (Req 5.15).
          hardenEnabled
            ? lastRetryHint
            : lastErrors
              ? lastErrors.join("; ")
              : null
        ),
        toolName: "submit_seo",
        toolDescription:
          "Submit the SEO assets bundle for the article (titles, description, slug, FAQ, tags, OG fields).",
        toolInputSchema: SEO_TOOL_SCHEMA,
        maxTokens: 1500,
        temperature: 0.4,
      });
      lastModel = result.model;
      lastUsage = result.usage || lastUsage;
      aggregateUsd += result.cost?.usdCost || 0;
      aggregateLatency += result.latencyMs || 0;

      if (hardenEnabled) {
        // ── Hardened path (HLP_SEO_HARDEN_ENABLED=true) ──────────────────
        let payload = normalizeSeoPayloadHardened(result.input);

        // Slug: normalize first; if the result is invalid (empty, illegal
        // chars, oversize) fall back to the slugified target keyword.
        payload.slug = slugify(payload.slug || targetKeyword);
        payload.slug = slugFallbackToTargetKeyword(payload.slug, targetKeyword);

        // Tags: dedupe before normalization so we don't waste budget on
        // duplicates that survive case-only differences.
        const dedupedTags = dedupeTags(payload.tags || []);
        payload.tags = dedupedTags
          .map(normalizeTag)
          .filter((t) => t && t.length >= 2);

        // FAQ citations: canonicalize both sides BEFORE the validator's
        // membership check (Req 5.1, 5.2 / Property 8). The validator still
        // calls `briefUrls.has(u)` internally, but with both sides canonical
        // the lookup is now URL-equivalence-correct.
        const canonicalBriefUrls = canonicalizeBriefUrlSet(briefUrls);
        if (Array.isArray(payload.faq)) {
          payload = {
            ...payload,
            faq: canonicalizeFaqUrls(payload.faq, briefUrls),
          };
        }

        let validation = validateSeo({
          payload,
          targetKeyword,
          briefUrls: canonicalBriefUrls,
        });

        // Inline auto-correct + re-validate, up to 3 iterations, ALL counted
        // as ONE retry attempt (Req 5.8).
        if (!validation.ok) {
          const corrected = runInlineAutoCorrect({
            payload,
            targetKeyword,
            canonicalBriefUrls,
            initialValidation: validation,
          });
          payload = corrected.payload;
          validation = corrected.validation;
        }

        // Snapshot the final per-attempt LLM payload (post auto-correct) so
        // terminal-failure debugging has the exact bundle the validator saw
        // last (Req 5.11). Updated on every attempt; the FINAL value wins.
        lastPayloadSnapshot = payload;

        // Record this attempt's validation errors with severity / actual /
        // expected / hint metadata (Req 5.10). Empty array on success.
        const attemptRecord = {
          attempt,
          validationErrors: (validation.errors || []).map((rule) => ({
            rule,
            severity: classifyError(rule),
            actual: extractActual(rule, payload),
            expected: expectedFor(rule),
            hint: buildRetryHintForRule(rule, { targetKeyword }),
          })),
        };
        perAttempt.push(attemptRecord);

        // Per-attempt telemetry log (Req 5.14). The `actual` field is run
        // through `redactForTelemetry` to strip body text / PII / long
        // strings before they leave the process.
        const topRule = attemptRecord.validationErrors[0]?.rule || "ok";
        const topActual = attemptRecord.validationErrors[0]?.actual ?? null;
        logger.info("[seo] attempt completed", {
          articleId,
          attempt,
          rule: topRule,
          actual: redactForTelemetry(topActual),
        });

        if (validation.ok) {
          const uniqueSlug = await ensureUniqueSlug({
            workspaceId,
            baseSlug: payload.slug,
          });
          return {
            seo: {
              metaTitleOptions: payload.metaTitleOptions,
              metaTitle: payload.metaTitleOptions[0],
              metaDescription: payload.metaDescription,
              slug: uniqueSlug,
              faq: payload.faq,
              tags: payload.tags,
              ogTitle: payload.ogTitle,
              ogDescription: payload.ogDescription,
              ogImage: null,
            },
            cost: {
              stageName: "seo",
              providerName: "anthropic",
              model: lastModel,
              promptTokens: lastUsage.promptTokens || 0,
              completionTokens: lastUsage.completionTokens || 0,
              unitsConsumed:
                (lastUsage.promptTokens || 0) + (lastUsage.completionTokens || 0),
              usdCost: result.cost?.usdCost || 0,
              costFlagged: result.cost?.flagged || false,
              latencyMs: result.latencyMs || 0,
              ts: new Date(),
            },
          };
        }

        // Still failing after the inline auto-correct loop. Build ONE
        // focused retry hint from the highest-severity rule (Req 5.5).
        lastErrors = validation.errors;
        lastRetryHint = pickFocusedRetryHint(validation.errors, {
          targetKeyword,
        });
        logger.warn("[seo] validation failed; retrying", {
          errors: validation.errors,
          hint: lastRetryHint,
        });
      } else {
        // ── Legacy path (flag off) — byte-identical to pre-feature code ──
        const payload = normalizeSeoPayload(result.input);
        // Normalize slug + tags before validation
        payload.slug = slugify(payload.slug || targetKeyword);
        payload.tags = (payload.tags || [])
          .map(normalizeTag)
          .filter((t) => t && t.length >= 2);

        const validation = validateSeo({
          payload,
          targetKeyword,
          briefUrls,
        });

        if (validation.ok) {
          const uniqueSlug = await ensureUniqueSlug({
            workspaceId,
            baseSlug: payload.slug,
          });
          return {
            seo: {
              metaTitleOptions: payload.metaTitleOptions,
              metaTitle: payload.metaTitleOptions[0],
              metaDescription: payload.metaDescription,
              slug: uniqueSlug,
              faq: payload.faq,
              tags: payload.tags,
              ogTitle: payload.ogTitle,
              ogDescription: payload.ogDescription,
              ogImage: null,
            },
            cost: {
              stageName: "seo",
              providerName: "anthropic",
              model: lastModel,
              promptTokens: lastUsage.promptTokens || 0,
              completionTokens: lastUsage.completionTokens || 0,
              unitsConsumed:
                (lastUsage.promptTokens || 0) + (lastUsage.completionTokens || 0),
              usdCost: result.cost?.usdCost || 0,
              costFlagged: result.cost?.flagged || false,
              latencyMs: result.latencyMs || 0,
              ts: new Date(),
            },
          };
        }
        lastErrors = validation.errors;
        logger.warn("[seo] validation failed; retrying", {
          errors: validation.errors,
        });
      }
    } catch (err) {
      // Transient transport-layer error handling (Req 5.9). When the
      // hardened flag is on and the error classifies as transient AND we
      // have transient retries left, replay the SAME attempt slot — do not
      // advance `attempt` and do not record a perAttempt entry, since the
      // LLM never produced a payload to validate.
      if (
        hardenEnabled
        && classifyTransportError(err) === "transient"
        && transientRetries < MAX_TRANSIENT_RETRIES
      ) {
        transientRetries++;
        logger.warn("[seo] transient transport error; replaying attempt", {
          articleId,
          attempt,
          transientRetries,
          message: err.message,
        });
        continue;
      }
      // Non-transient (or transient budget exhausted): bucket as validation.
      lastErrors = [err.message];
      if (hardenEnabled) {
        lastRetryHint = err.message;
        // Telemetry parity with the validation-failure path so the operator
        // sees one log line per attempt slot regardless of failure mode.
        logger.info("[seo] attempt completed", {
          articleId,
          attempt,
          rule: "transport_error",
          actual: redactForTelemetry(err.message),
        });
      }
      logger.warn("[seo] tool-use failed; retrying", { message: err.message });
    }
    attempt++;
  }

  const err = new Error("SEO generation failed after retries");
  err.code = "SEO_VALIDATION_FAILED";

  if (hardenEnabled) {
    // Extended details payload (Req 5.10, 5.11, 5.13). The legacy
    // `details.errors` array is preserved as a sibling key so existing
    // consumers continue to work unchanged (Property 11).
    const lastAttemptErrors =
      perAttempt[perAttempt.length - 1]?.validationErrors || [];
    const allRecoverable =
      lastAttemptErrors.length > 0
      && lastAttemptErrors.every((e) => e.severity === "recoverable");
    const category = allRecoverable ? "recoverable" : "fatal";
    err.details = {
      errors: lastErrors,
      category,
      perAttempt,
      lastPayloadSnapshot,
    };
  } else {
    // Flag-off: byte-identical to the pre-feature throw shape (Req 5.15).
    err.details = { errors: lastErrors };
  }

  err.totalUsd = aggregateUsd;
  err.totalLatency = aggregateLatency;
  throw err;
};
