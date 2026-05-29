import { canonicalUrl } from "#utils/textUtil.js";

/**
 * ============================================================
 *  SEO Validation Categories — Requirement 5 (helpers in isolation)
 * ============================================================
 *
 * Pure, dependency-free classification helpers used by the hardened
 * SEO validator (Task 13.x) to decide whether a given validation
 * failure is recoverable (auto-correct + inline re-validate) or
 * fatal (terminate the retry loop and surface SEO_VALIDATION_FAILED
 * with category="fatal").
 *
 * Categorization guidance is taken verbatim from
 *   design.md → "SEO_VALIDATION_FAILED — Root Cause Analysis & Remediation"
 *
 *   Recoverable: length drift within tolerance, single-word slug
 *                mismatch, missing OG description, single FAQ pair shy
 *                of length, canonicalizable URL mismatch, duplicate tag,
 *                near-keyword title (Levenshtein ≤ 3).
 *
 *   Fatal:       no allowed citation URLs in any FAQ pair after retries,
 *                target keyword absent from every meta title slot,
 *                structural schema violation (e.g. wrong array arity).
 *
 * The rule names below are the exact strings pushed by `validateSeo`
 * in `seoService.js`. Any rule name not present in this map defaults
 * to "fatal" so that classification is total (Property 10 / Req 5.7):
 * unknown failures are treated conservatively rather than silently
 * skipped or auto-retried forever.
 */

/**
 * Severity of every rule name produced by `validateSeo`.
 *
 * Recoverable rules can be auto-corrected by the helpers in
 * `seoValidationCategories` (canonicalizeFaqUrls, rebalanceFaqAnswerLength,
 * dedupeTags, slugFallbackToTargetKeyword, levenshteinSubstituteKeyword)
 * and re-validated inline without consuming a full retry slot.
 *
 * Fatal rules indicate a structural schema violation that re-prompting
 * is unlikely to fix in three retries; the validator escalates straight
 * to terminal failure.
 *
 * @type {Readonly<Record<string, "recoverable" | "fatal">>}
 */
export const RULE_CATEGORIES = Object.freeze({
  // ── meta titles ────────────────────────────────────────────────────────
  // Structural arity violation — schema requires exactly 3 entries; the
  // model returning 2 or 4 is not "near-miss" drift.
  "metaTitleOptions must have exactly 3 entries": "fatal",
  // Length drift on one or more titles is within tolerance and the
  // re-prompt with a focused hint converges quickly.
  "metaTitleOptions length out of range": "recoverable",
  // Recoverable via `levenshteinSubstituteKeyword` (Levenshtein ≤ 3).
  // If every slot is too far from the keyword the helper returns the
  // input unchanged and the validator escalates to fatal on the next
  // attempt — but the rule itself stays recoverable so the helper runs.
  "no meta title contains target keyword": "recoverable",

  // ── meta description ──────────────────────────────────────────────────
  "metaDescription length out of range": "recoverable",
  "metaDescription must contain target keyword exactly once": "recoverable",

  // ── slug ──────────────────────────────────────────────────────────────
  // Recoverable via `slugFallbackToTargetKeyword`.
  "slug missing or too long": "recoverable",

  // ── FAQ ───────────────────────────────────────────────────────────────
  // Structural arity violation — schema requires ≥ 3 pairs.
  "FAQ must have at least 3 pairs": "fatal",
  "FAQ question length out of range": "recoverable",
  // Recoverable via `rebalanceFaqAnswerLength` (target midpoint of [100,300]).
  "FAQ answer length out of range": "recoverable",
  // Recoverable via `canonicalizeFaqUrls` (canonicalUrl equality).
  // Terminal failure surfaces only when no allowed citation URL exists
  // in any FAQ pair after the retry budget is exhausted — that is
  // handled by the retry loop, not the per-rule classification.
  "FAQ pair missing valid citation URL": "recoverable",

  // ── tags ──────────────────────────────────────────────────────────────
  // Recoverable via `dedupeTags` plus a focused re-prompt hint.
  "tags must have at least 3 entries": "recoverable",
});

/**
 * Classify a single validation rule name.
 *
 * Returns the severity for known rules. For an unknown rule name —
 * which can happen if `validateSeo` grows a new rule that this map
 * has not yet been updated for — defaults to "fatal" so the validator
 * fails closed rather than silently looping forever (Requirement 5.7).
 *
 * @param {string} rule  The exact rule string pushed by `validateSeo`.
 * @returns {"recoverable" | "fatal"}
 */
export const classifyError = (rule) => {
  if (typeof rule !== "string") return "fatal";
  return RULE_CATEGORIES[rule] ?? "fatal";
};

/**
 * Deterministic comparator over `{ rule, severity }` error records.
 *
 * Sort order (stable across runs and across Node versions):
 *   1. Fatal errors come before recoverable errors.
 *   2. Within the same severity, errors are ordered lexicographically
 *      by `rule` name (default JS string comparison).
 *
 * Used by the SEO retry loop (Task 13.1) to pick exactly one focused
 * retry hint per attempt — the highest-severity rule, fatal-first,
 * then alphabetical for tie-breaking.
 *
 * @param {{ rule: string, severity: "recoverable" | "fatal" }} a
 * @param {{ rule: string, severity: "recoverable" | "fatal" }} b
 * @returns {number}  Negative if `a` should come first, positive if `b`,
 *                    zero if equivalent.
 */
export const compareErrors = (a, b) => {
  const aFatal = a?.severity === "fatal";
  const bFatal = b?.severity === "fatal";
  if (aFatal !== bFatal) return aFatal ? -1 : 1;

  const aRule = typeof a?.rule === "string" ? a.rule : "";
  const bRule = typeof b?.rule === "string" ? b.rule : "";
  if (aRule < bRule) return -1;
  if (aRule > bRule) return 1;
  return 0;
};

/**
 * ============================================================
 *  Auto-correct helpers — Requirement 5.1–5.8
 * ============================================================
 *
 * Each helper is pure, deterministic, and side-effect-free so the
 * SEO retry loop (Task 13.1) can call them inline and re-validate
 * without consuming a full retry slot. The helpers are intentionally
 * conservative: when they cannot recover a payload they return the
 * input unchanged so the validator escalates the failure cleanly
 * (rather than masking it with a synthetic value).
 */

/**
 * Canonicalize FAQ citation URLs against the brief's allowed source set.
 *
 * Both the brief URL set and each FAQ pair's `citationUrls` are passed
 * through `canonicalUrl` (which strips utm_\* /fbclid/gclid params, the
 * fragment, and a single trailing slash). Any FAQ URL whose canonical
 * form is NOT in the canonical brief set is dropped, since the validator
 * requires every citation to be drawn from the supplied source list.
 *
 * Returns a new FAQ array; inputs are never mutated.
 *
 * @param {Array<{ question: string, answer: string, citationUrls: string[] }>} faq
 * @param {Set<string> | string[] | Iterable<string>} briefUrls
 * @returns {Array<{ question: string, answer: string, citationUrls: string[] }>}
 */
export const canonicalizeFaqUrls = (faq, briefUrls) => {
  if (!Array.isArray(faq)) return [];

  const canonicalAllowed = new Set();
  if (briefUrls) {
    const iter =
      briefUrls instanceof Set || Array.isArray(briefUrls)
        ? briefUrls
        : typeof briefUrls[Symbol.iterator] === "function"
          ? briefUrls
          : [];
    for (const u of iter) {
      const c = canonicalUrl(u);
      if (c) canonicalAllowed.add(c);
    }
  }

  return faq.map((pair) => {
    if (!pair || typeof pair !== "object") return pair;
    const inputUrls = Array.isArray(pair.citationUrls) ? pair.citationUrls : [];
    const seen = new Set();
    const normalized = [];
    for (const raw of inputUrls) {
      const c = canonicalUrl(raw);
      if (!c) continue;
      if (!canonicalAllowed.has(c)) continue;
      if (seen.has(c)) continue;
      seen.add(c);
      normalized.push(c);
    }
    return { ...pair, citationUrls: normalized };
  });
};

/**
 * Deterministic filler suffix for short FAQ answers.
 *
 * Chosen to be content-neutral (no claims of fact) and long enough that
 * a single append always lifts a sub-100-character answer above the
 * 100-character minimum without overshooting the 300-character ceiling
 * for any input below 100.
 *
 *   filler.length === 102  → for input length L < 100,
 *   L + 102 ∈ [102, 201], which is always within [100, 300].
 */
const FAQ_FILLER_SUFFIX =
  " This information is provided as a general reference and may vary based on individual circumstances.";

/**
 * Rebalance an FAQ answer so its length is within [100, 300] for every input.
 *
 * Behavior:
 *   - length ∈ [100, 300]: returned as-is (after coercion to string).
 *   - length < 100: append `FAQ_FILLER_SUFFIX` deterministically until the
 *                   answer reaches at least 100 chars, never going past 300.
 *                   With the chosen filler size (102), one append is always
 *                   sufficient.
 *   - length > 300: truncate at the last sentence-ending punctuation
 *                   (`.`, `!`, `?`) at or before character 300. If no such
 *                   boundary exists in the prefix, hard-truncate at 300.
 *                   If that produces a string shorter than 100 chars
 *                   (e.g. the input had no early sentence boundary OR the
 *                   only boundary is very early), fall through to the
 *                   "too short" branch and append filler.
 *
 * INVARIANT: result.length ∈ [100, 300] for ALL inputs.
 * (Requirement 5.3, 5.4 / Property 9.)
 *
 * The function is stateless and deterministic — same input always
 * produces the same output — so it is safe to call inside the validator's
 * inline auto-correct pass.
 *
 * @param {string} answer
 * @returns {string}
 */
export const rebalanceFaqAnswerLength = (answer) => {
  let s = typeof answer === "string" ? answer : String(answer ?? "");

  // Long-answer branch: truncate at the last sentence-ending punctuation
  // at or before character 300, falling back to a hard cut at 300.
  if (s.length > 300) {
    const window = s.slice(0, 300);
    let cut = -1;
    for (let i = window.length - 1; i >= 0; i--) {
      const ch = window[i];
      if (ch === "." || ch === "!" || ch === "?") {
        cut = i + 1; // include the punctuation
        break;
      }
    }
    s = (cut > 0 ? window.slice(0, cut) : window).trim();
  }

  // Short-answer branch: append the fixed filler until we clear the
  // 100-character minimum, but never let the result exceed 300.
  if (s.length < 100) {
    while (s.length < 100 && s.length + FAQ_FILLER_SUFFIX.length <= 300) {
      s = `${s}${FAQ_FILLER_SUFFIX}`;
    }
    // Defensive ceiling: if a pathological input combined with the filler
    // somehow lands above 300, hard-truncate to 300 so the invariant holds.
    if (s.length > 300) s = s.slice(0, 300);
    // Defensive floor: if appending the filler would exceed 300 (only
    // possible when the input is itself > 198 chars but the long-answer
    // branch already left us in [100, 300]), hard-pad with spaces. In
    // practice this branch is unreachable but keeps the invariant total.
    if (s.length < 100) {
      s = s.padEnd(100, " ");
    }
  }

  return s;
};

/**
 * Lowercase, trim, and dedupe a tag list while preserving first-seen order.
 *
 * Empty/whitespace-only entries are dropped. Non-string entries are coerced
 * via `String(tag)` before normalization; `null`/`undefined` are skipped.
 * Returns a new array; the input is never mutated.
 *
 * @param {Array<string>} tags
 * @returns {string[]}
 */
export const dedupeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of tags) {
    if (raw === null || raw === undefined) continue;
    const norm = String(raw).trim().toLowerCase();
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
};

/**
 * Inline slugify helper — lowercase, replace any non-alphanumeric run with
 * a single hyphen, then trim leading/trailing hyphens.
 *
 *   "Hello, World!"      → "hello-world"
 *   "  multi   word  "   → "multi-word"
 *   "Foo--Bar__baz"      → "foo-bar-baz"
 *
 * @param {string} input
 * @returns {string}
 */
const slugifyKeyword = (input) => {
  const s = typeof input === "string" ? input : String(input ?? "");
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Slug compliance check used by `slugFallbackToTargetKeyword`.
 * The validator requires lowercase alphanumerics and hyphens only,
 * and a non-empty string of length ≤ 75.
 */
const isValidSlug = (slug) =>
  typeof slug === "string" &&
  slug.length > 0 &&
  slug.length <= 75 &&
  /^[a-z0-9-]+$/.test(slug);

/**
 * Fall back to a slugified target keyword when the model-generated slug
 * is missing, empty, or contains characters outside `[a-z0-9-]`.
 *
 * @param {string} slug
 * @param {string} targetKeyword
 * @returns {string}
 */
export const slugFallbackToTargetKeyword = (slug, targetKeyword) => {
  if (isValidSlug(slug)) return slug;
  return slugifyKeyword(targetKeyword);
};

/**
 * Levenshtein edit distance (classic DP, two-row optimization).
 * Case-insensitive on the inputs so "iPhone" and "iphone" compare as equal.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
const levenshtein = (a, b) => {
  const s = (typeof a === "string" ? a : String(a ?? "")).toLowerCase();
  const t = (typeof b === "string" ? b : String(b ?? "")).toLowerCase();
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  let prev = new Array(t.length + 1);
  let curr = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[t.length];
};

/**
 * Locate the substring of `title` whose Levenshtein distance to
 * `keyword` is smallest, and return its position + length. Searches
 * substring lengths in `[max(1, |kw|-maxDistance), |kw|+maxDistance]`
 * which is sufficient because any closer substring must lie within
 * that length window (insertions/deletions cost 1 each).
 *
 * Ties broken deterministically: smallest distance wins; on equal
 * distance, the leftmost match wins; on equal start, the shorter
 * substring wins.
 *
 * @param {string} title
 * @param {string} keyword
 * @param {number} maxDistance
 * @returns {{ start: number, length: number, distance: number } | null}
 */
const findClosestSubstring = (title, keyword, maxDistance) => {
  const titleStr = typeof title === "string" ? title : String(title ?? "");
  const kw = typeof keyword === "string" ? keyword : String(keyword ?? "");
  if (!titleStr || !kw) return null;

  const minLen = Math.max(1, kw.length - maxDistance);
  const maxLen = kw.length + maxDistance;

  let best = null;
  for (let len = minLen; len <= maxLen; len++) {
    if (len > titleStr.length) break;
    for (let start = 0; start + len <= titleStr.length; start++) {
      const sub = titleStr.slice(start, start + len);
      const d = levenshtein(sub, kw);
      if (d > maxDistance) continue;
      if (
        best === null ||
        d < best.distance ||
        (d === best.distance && start < best.start) ||
        (d === best.distance && start === best.start && len < best.length)
      ) {
        best = { start, length: len, distance: d };
        if (d === 0) return best; // can't beat exact match
      }
    }
  }
  return best;
};

/**
 * If at least one meta-title option lies within `maxDistance` Levenshtein
 * edits of the target keyword, deterministically replace the closest
 * substring inside that title with the exact keyword and return the
 * updated array (same length, same order). If no title is within range,
 * the input array is returned unchanged.
 *
 * The substitution targets the title with the smallest title-level
 * distance first; ties are broken by index (lowest wins) so the operation
 * is deterministic across runs.
 *
 * @param {string[]} metaTitleOptions
 * @param {string} targetKeyword
 * @param {number} [maxDistance=3]
 * @returns {string[]}
 */
export const levenshteinSubstituteKeyword = (
  metaTitleOptions,
  targetKeyword,
  maxDistance = 3
) => {
  if (!Array.isArray(metaTitleOptions)) return metaTitleOptions;
  const kw = typeof targetKeyword === "string" ? targetKeyword : String(targetKeyword ?? "");
  if (!kw) return metaTitleOptions.slice();

  // Identify candidate titles: those whose closest substring is within
  // maxDistance of the keyword. Pick the smallest distance, ties → lowest index.
  let pickIdx = -1;
  let pickMatch = null;
  let pickDistance = Infinity;
  for (let i = 0; i < metaTitleOptions.length; i++) {
    const title = metaTitleOptions[i];
    if (typeof title !== "string" || !title) continue;
    // Already contains the keyword (case-insensitive)? Skip — no fix needed.
    if (title.toLowerCase().includes(kw.toLowerCase())) continue;
    const match = findClosestSubstring(title, kw, maxDistance);
    if (match && match.distance < pickDistance) {
      pickDistance = match.distance;
      pickIdx = i;
      pickMatch = match;
    }
  }

  if (pickIdx === -1 || pickMatch === null) {
    return metaTitleOptions.slice();
  }

  const next = metaTitleOptions.slice();
  const original = next[pickIdx];
  next[pickIdx] =
    original.slice(0, pickMatch.start) +
    kw +
    original.slice(pickMatch.start + pickMatch.length);
  return next;
};
