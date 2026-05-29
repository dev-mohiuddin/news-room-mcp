import { htmlToPlain } from "#utils/textUtil.js";

/**
 * ============================================================
 *  Burstiness Validator — Human-Like Pipeline (Requirement 8)
 * ============================================================
 *
 *  Post-draft sentence-length variance analysis. Modern AI detectors
 *  (Originality.ai, GPTZero, Copyleaks) flag uniform sentence length
 *  as the #1 synthetic signal. Human writing naturally mixes short,
 *  medium, and long sentences; LLM output tends toward a narrow band.
 *
 *  Two checks:
 *    1. Coefficient of Variation (CV) of sentence lengths across the
 *       entire article. Human writing typically has CV >= 0.4; AI
 *       writing often has CV < 0.25.
 *    2. Consecutive same-length run detection — strings of 4+ sentences
 *       within ±2 words of each other are a giveaway.
 *
 *  Contract:
 *    - Pure function: no I/O, no LLM calls, no DB writes.
 *    - Input:  { paragraphs: [{ html, wordCount?, ... }] }
 *    - Output: { ok: true } | { ok: false, reason, details, retryHint }
 *
 *  Gated by HLP_BURSTINESS_VALIDATION_ENABLED in draftService.
 *  When the flag is OFF, this module is never invoked.
 */

const SENTENCE_SPLIT_RE = /[.!?]+\s+/g;

const MIN_SENTENCES_TO_ANALYZE = 5;
const CV_THRESHOLD = 0.25;
const MAX_CONSECUTIVE_UNIFORM_RUN = 4;

/**
 * Extract sentence word-lengths from a single HTML paragraph.
 * Sentences shorter than 5 words are excluded (fragments, abbreviations).
 */
const extractSentenceLengths = (html) => {
  const plain = htmlToPlain(html);
  const sentences = plain.split(SENTENCE_SPLIT_RE).filter((s) => s.trim().length > 5);
  return sentences.map((s) => s.trim().split(/\s+/).filter(Boolean).length);
};

/**
 * Compute the coefficient of variation (stdDev / mean) for an array of numbers.
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
 * Find the longest run of consecutive sentences whose lengths are within
 * ±2 words of each other.
 */
const findMaxConsecutiveUniformRun = (lengths) => {
  if (lengths.length === 0) return 0;
  let maxRun = 1;
  let currentRun = 1;
  for (let i = 1; i < lengths.length; i++) {
    if (Math.abs(lengths[i] - lengths[i - 1]) <= 2) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 1;
    }
  }
  return maxRun;
};

/**
 * Public entry point.
 *
 * @param {{ paragraphs: Array<{ html: string }> }} args
 * @returns {{ ok: boolean, reason?: string, details?: object, retryHint?: string }}
 */
export const validateBurstiness = ({ paragraphs } = {}) => {
  const input = Array.isArray(paragraphs) ? paragraphs : [];
  if (input.length === 0) return { ok: true };

  // Collect all sentence lengths across the article.
  const allLengths = [];
  for (const p of input) {
    if (!p?.html) continue;
    allLengths.push(...extractSentenceLengths(p.html));
  }

  if (allLengths.length < MIN_SENTENCES_TO_ANALYZE) {
    // Too short to meaningfully analyze — let it pass.
    return { ok: true };
  }

  // Check 1: Coefficient of Variation.
  const cv = coefficientOfVariation(allLengths);
  if (cv < CV_THRESHOLD) {
    const mean = allLengths.reduce((a, b) => a + b, 0) / allLengths.length;
    return {
      ok: false,
      reason: "low_burstiness",
      details: {
        coefficientOfVariation: Math.round(cv * 1000) / 1000,
        meanSentenceLength: Math.round(mean * 10) / 10,
        sentenceCount: allLengths.length,
      },
      retryHint:
        `Sentences are too uniform (CV=${(Math.round(cv * 1000) / 1000).toFixed(3)}, threshold=${CV_THRESHOLD}). ` +
        "Mix short (3–7 word), medium (8–15 word), and long (16–30 word) sentences. " +
        "After two long sentences, drop a short one. Strings of 18–22 word sentences are a giveaway.",
    };
  }

  // Check 2: Consecutive same-length run.
  const maxRun = findMaxConsecutiveUniformRun(allLengths);
  if (maxRun > MAX_CONSECUTIVE_UNIFORM_RUN) {
    return {
      ok: false,
      reason: "consecutive_uniform_sentences",
      details: {
        maxConsecutiveRun: maxRun,
        threshold: MAX_CONSECUTIVE_UNIFORM_RUN,
        sentenceCount: allLengths.length,
      },
      retryHint:
        `${maxRun} consecutive sentences have similar length (threshold=${MAX_CONSECUTIVE_UNIFORM_RUN}). ` +
        "Break the pattern: insert a very short sentence (3–5 words) or a much longer one (20+ words).",
    };
  }

  return { ok: true };
};

export default { validateBurstiness };
