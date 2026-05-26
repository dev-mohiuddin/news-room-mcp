import crypto from "node:crypto";

/**
 * ============================================================
 *  Text utilities — tokenization, hashing, canonical URLs
 * ============================================================
 *
 *  Tokenization (Requirement 6.3):
 *    NFKC normalize → lowercase → strip punctuation →
 *    collapse whitespace → split on whitespace.
 *
 *  These rules drive the originality verbatim-span detector,
 *  citation density check, and word counts.
 */

const PUNCT_REGEX = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~–—…“”‘’«»·]/g;

export const normalizeText = (input = "") =>
  String(input).normalize("NFKC").toLowerCase();

export const tokenize = (input = "") => {
  if (!input) return [];
  const normalized = normalizeText(input).replace(PUNCT_REGEX, " ");
  return normalized.split(/\s+/u).filter(Boolean);
};

export const wordCount = (input = "") => tokenize(input).length;

export const sha256Hex = (input) =>
  crypto.createHash("sha256").update(String(input)).digest("hex");

/**
 * Canonical URL — strip utm_*, fragment, trailing slash.
 * Per Requirement 2.6 and 4.4.
 */
export const canonicalUrl = (raw = "") => {
  if (!raw) return "";
  let u;
  try {
    u = new URL(raw);
  } catch {
    return String(raw).trim();
  }
  u.hash = "";
  // Drop utm_*, fbclid, gclid
  const dropPrefixes = ["utm_", "fbclid", "gclid", "yclid", "mc_", "_hsenc", "_hsmi"];
  const keepEntries = [];
  for (const [k, v] of u.searchParams.entries()) {
    if (dropPrefixes.some((p) => k.toLowerCase().startsWith(p))) continue;
    keepEntries.push([k, v]);
  }
  u.search = "";
  for (const [k, v] of keepEntries) u.searchParams.append(k, v);

  let out = u.toString();
  if (out.endsWith("/")) out = out.slice(0, -1);
  return out;
};

/**
 * Strip HTML tags and collapse whitespace — used to derive plain text
 * from sanitized paragraph HTML before counting words / running originality.
 */
export const htmlToPlain = (html = "") => {
  if (!html) return "";
  return String(html)
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Find a 12-token contiguous span that appears verbatim in both
 * `articleTokens` and `sourceTokens`. Returns the first match or null.
 *
 *  Matches are case-insensitive (already normalized by tokenize()).
 *
 * Note: Naive O(n*m) for clarity — fine at MVP volumes (~5 sources × 20k chars).
 *       If profiling shows hotspots, swap to a rolling-hash index.
 */
export const findVerbatimSpan = ({
  articleTokens,
  sourceTokens,
  spanLength = 12,
}) => {
  if (
    !Array.isArray(articleTokens) ||
    !Array.isArray(sourceTokens) ||
    articleTokens.length < spanLength ||
    sourceTokens.length < spanLength
  ) {
    return null;
  }

  // Build a Set of joined source spans for fast lookup.
  const sourceSpans = new Map();
  for (let i = 0; i + spanLength <= sourceTokens.length; i++) {
    const key = sourceTokens.slice(i, i + spanLength).join(" ");
    if (!sourceSpans.has(key)) sourceSpans.set(key, i);
  }

  for (let i = 0; i + spanLength <= articleTokens.length; i++) {
    const key = articleTokens.slice(i, i + spanLength).join(" ");
    const sourceStart = sourceSpans.get(key);
    if (sourceStart !== undefined) {
      return {
        articleStart: i,
        articleEnd: i + spanLength,
        sourceStart,
        sourceEnd: sourceStart + spanLength,
        tokenCount: spanLength,
      };
    }
  }
  return null;
};
