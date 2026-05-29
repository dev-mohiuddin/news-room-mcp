/**
 * ============================================================
 *  Paragraph Variation Validator — Human-Like Pipeline (Requirement 10)
 * ============================================================
 *
 *  Post-draft paragraph-length variance analysis. AI-generated articles
 *  often have uniform paragraph lengths (~120-180 words each), which is
 *  a strong synthetic signal. Human writers naturally vary paragraph
 *  length: some punchy (40-60 words), some detailed (180-250 words),
 *  some transitional (20-40 words).
 *
 *  Two checks:
 *    1. Coefficient of Variation (CV) of paragraph word counts.
 *       Human articles typically have CV >= 0.3; AI writing often
 *       has CV < 0.2.
 *    2. Length distribution check — verifies the article contains at
 *       least some short (< 80 words), medium (80-180), and long
 *       (> 180 words) paragraphs.
 *
 *  Contract:
 *    - Pure function: no I/O, no LLM calls, no DB writes.
 *    - Input:  { paragraphs: [{ html, wordCount?, ... }] }
 *    - Output: { ok: true } | { ok: false, reason, details, retryHint }
 *
 *  Gated by HLP_PARAGRAPH_VARIATION_ENABLED in draftService.
 *  When the flag is OFF, this module is never invoked.
 */

import { htmlToPlain } from "#utils/textUtil.js";

const MIN_PARAGRAPHS_TO_ANALYZE = 4;
const CV_THRESHOLD = 0.2;

const SHORT_PARAGRAPH_MAX = 80;
const LONG_PARAGRAPH_MIN = 180;

/**
 * Count words in an HTML paragraph. Uses htmlToPlain for accuracy.
 */
const countParagraphWords = (html) => {
  const plain = htmlToPlain(html);
  return plain.split(/\s+/).filter(Boolean).length;
};

/**
 * Compute the coefficient of variation (stdDev / mean) for an array.
 */
const coefficientOfVariation = (values) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
};

/**
 * Public entry point.
 *
 * @param {{ paragraphs: Array<{ html: string, wordCount?: number }> }} args
 * @returns {{ ok: boolean, reason?: string, details?: object, retryHint?: string }}
 */
export const validateParagraphVariation = ({ paragraphs } = {}) => {
  const input = Array.isArray(paragraphs) ? paragraphs : [];
  if (input.length < MIN_PARAGRAPHS_TO_ANALYZE) {
    return { ok: true };
  }

  // Collect word counts — use pre-computed wordCount if available, else compute.
  const wordCounts = input.map((p) => {
    if (typeof p?.wordCount === "number" && p.wordCount > 0) return p.wordCount;
    if (p?.html) return countParagraphWords(p.html);
    return 0;
  }).filter((w) => w > 0);

  if (wordCounts.length < MIN_PARAGRAPHS_TO_ANALYZE) {
    return { ok: true };
  }

  // Check 1: Coefficient of Variation.
  const cv = coefficientOfVariation(wordCounts);
  if (cv < CV_THRESHOLD) {
    const mean = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
    return {
      ok: false,
      reason: "uniform_paragraph_length",
      details: {
        coefficientOfVariation: Math.round(cv * 1000) / 1000,
        meanParagraphLength: Math.round(mean),
        paragraphCount: wordCounts.length,
        lengths: wordCounts,
      },
      retryHint:
        `All paragraphs are similar length (~${Math.round(mean)} words, CV=${(Math.round(cv * 1000) / 1000).toFixed(3)}). ` +
        "Vary paragraph length: some short (40–80 words, punchy transitions), " +
        "some medium (80–180 words, standard), some long (180–250 words, deep analysis). " +
        "A 1-2 sentence paragraph after a long one is a strong human signal.",
    };
  }

  // Check 2: Length distribution — ensure at least some variety.
  const shortCount = wordCounts.filter((w) => w <= SHORT_PARAGRAPH_MAX).length;
  const longCount = wordCounts.filter((w) => w >= LONG_PARAGRAPH_MIN).length;
  const total = wordCounts.length;

  // If ALL paragraphs are medium-length (no short, no long), flag it.
  if (shortCount === 0 && longCount === 0 && total >= 5) {
    return {
      ok: false,
      reason: "no_paragraph_length_variety",
      details: {
        shortCount: 0,
        mediumCount: total,
        longCount: 0,
        thresholdShort: SHORT_PARAGRAPH_MAX,
        thresholdLong: LONG_PARAGRAPH_MIN,
      },
      retryHint:
        "Every paragraph is medium-length (80–180 words). Add variety: " +
        "include at least one short paragraph (1–2 sentences, 40–80 words) " +
        "and at least one longer paragraph (180+ words) for depth.",
    };
  }

  return { ok: true };
};

export default { validateParagraphVariation };
