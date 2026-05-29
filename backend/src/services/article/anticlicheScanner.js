import { htmlToPlain } from "#utils/textUtil.js";

/**
 * ============================================================
 *  Anti-Cliché Scanner — Human-Like Pipeline (Requirement 11)
 * ============================================================
 *
 *  Post-draft scan for AI-cliché phrases that are strong synthetic
 *  signals. Modern detectors flag these phrases even when the rest
 *  of the article is well-written.
 *
 *  The banned list covers:
 *    - Latinate filler ("delve into", "harness the potential")
 *    - Cliché idioms ("tip of the iceberg", "double-edged sword")
 *    - AI tell-tale transitions ("in today's fast-paced world")
 *    - Vague intensifiers ("testament to", "a myriad of")
 *
 *  Contract:
 *    - Pure function: no I/O, no LLM calls, no DB writes.
 *    - Input:  { paragraphs: [{ html, ... }] }
 *    - Output: { ok: true } | { ok: false, reason, details, retryHint }
 *
 *  Gated by HLP_ANTICLICHE_SCANNER_ENABLED in draftService.
 *  When the flag is OFF, this module is never invoked.
 */

/**
 * Phrases that strongly correlate with AI-generated text.
 * Sorted by detection severity (most flagged first).
 */
const BANNED_PHRASES = Object.freeze([
  // Tier 1 — highest AI-detection flag rate
  "delve into",
  "delve deep",
  "navigate the landscape",
  "in today's fast-paced world",
  "in today's rapidly evolving",
  "it's important to note",
  "it is important to note",
  "unleash the power",
  "harness the potential",
  "in conclusion",
  "in essence",
  "tapestry",
  "in the realm of",
  "a myriad of",
  "the ever-evolving",
  "testament to",

  // Tier 2 — moderate AI-detection flag rate
  "moreover",
  "furthermore",
  "additionally",
  "pivotal role",
  "robust",
  "shed light on",
  "paint a picture",
  "the tip of the iceberg",
  "a double-edged sword",
  "goes without saying",
  "at the end of the day",
  "when it comes to",
  "in order to",
  "as a matter of fact",
  "by and large",
  "the bottom line",
  "a wealth of",
  "rich tapestry",
  "bustling",
  "vibrant tapestry",
  "dynamic landscape",
  "ever-changing landscape",
  "rapidly changing world",
  "complex and multifaceted",
  "plays a crucial role",
  "plays a vital role",
  "plays a significant role",
  "cannot be overstated",
  "foster a sense of",
  "foster collaboration",
  "leave no stone unturned",
  "think outside the box",
  "paradigm shift",
]);

/**
 * Public entry point.
 *
 * @param {{ paragraphs: Array<{ html: string, id?: string }> }} args
 * @returns {{ ok: boolean, reason?: string, details?: object, retryHint?: string }}
 */
export const scanForCliches = ({ paragraphs } = {}) => {
  const input = Array.isArray(paragraphs) ? paragraphs : [];
  if (input.length === 0) return { ok: true };

  const hits = [];
  for (const p of input) {
    if (!p?.html) continue;
    const plain = htmlToPlain(p.html).toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (plain.includes(phrase)) {
        hits.push({
          paragraphId: p.id || null,
          phrase,
          tag: p.tag || null,
        });
      }
    }
  }

  if (hits.length > 0) {
    const uniquePhrases = [...new Set(hits.map((h) => h.phrase))];
    return {
      ok: false,
      reason: "cliches_detected",
      details: {
        hits,
        totalCount: hits.length,
        uniquePhrases: uniquePhrases.length,
        phrases: uniquePhrases.slice(0, 10),
      },
      retryHint:
        `Found ${hits.length} AI-cliché phrase(s): ${uniquePhrases.slice(0, 3).map((p) => `"${p}"`).join(", ")}. ` +
        "Replace with direct, specific language. " +
        "Instead of 'delve into', use 'examine' or 'explore'. " +
        "Instead of 'in conclusion', just end with a concrete action or insight.",
    };
  }

  return { ok: true };
};

export default { scanForCliches };
