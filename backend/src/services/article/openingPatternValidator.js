import { htmlToPlain } from "#utils/textUtil.js";

/**
 * ============================================================
 *  Opening Pattern Diversity Validator — Human-Like Pipeline (Requirement 12)
 * ============================================================
 *
 *  Post-draft analysis of how each paragraph begins. AI-generated
 *  articles often start paragraphs with the same syntactic pattern
 *  (e.g., "The..." or "In addition,..."), which creates a robotic
 *  rhythm. Human writers rotate among different opening shapes.
 *
 *  Two checks:
 *    1. Opening shape dominance — if > 50% of paragraphs start with
 *       the same pattern (article_start, declarative, prepositional,
 *       etc.), flag it.
 *    2. Repetitive first word — if any single word (≥ 3 chars) starts
 *       more than 2 paragraphs, flag it.
 *
 *  Contract:
 *    - Pure function: no I/O, no LLM calls, no DB writes.
 *    - Input:  { paragraphs: [{ html, ... }] }
 *    - Output: { ok: true } | { ok: false, reason, details, retryHint }
 *
 *  Gated by HLP_OPENING_DIVERSITY_ENABLED in draftService.
 *  When the flag is OFF, this module is never invoked.
 */

/**
 * Classify the syntactic shape of a paragraph's opening sentence.
 */
const getOpeningShape = (html) => {
  const plain = htmlToPlain(html).trim();
  const firstSentence = plain.split(/[.!?]+/)[0]?.trim() || "";
  if (!firstSentence) return "empty";

  if (/^(the|a|an)\s/i.test(firstSentence)) return "article_start";
  if (/^(however|but|yet|although|though|nevertheless|nonetheless)\b/i.test(firstSentence)) return "counter_claim";
  if (/^(what|why|how|when|where|who|is|are|do|does|did|can|could|would|should|will|shall)\b/i.test(firstSentence)) return "question_or_inquiry";
  if (/^[A-Z][a-z]+['']s\b/.test(firstSentence)) return "named_entity";
  if (/^\d+/.test(firstSentence)) return "number_lead";
  if (/^(in|on|at|by|for|with|from|to|under|over|between|among)\b/i.test(firstSentence)) return "prepositional";
  if (/^(this|these|those|that)\b/i.test(firstSentence)) return "demonstrative";
  if (/^(for example|for instance|such as|namely)\b/i.test(firstSentence)) return "exemplification";
  if (/^(notably|significantly|importantly|interestingly|remarkably)\b/i.test(firstSentence)) return "adverbial";

  return "declarative";
};

/**
 * Extract the first word of a paragraph (alphabetic, ≥ 2 chars).
 */
const getOpeningWord = (html) => {
  const plain = htmlToPlain(html).trim();
  const firstSentence = plain.split(/[.!?]+/)[0]?.trim() || "";
  const firstWord = firstSentence.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
  return firstWord && firstWord.length >= 2 ? firstWord : "";
};

/**
 * Public entry point.
 *
 * @param {{ paragraphs: Array<{ html: string, id?: string }> }} args
 * @returns {{ ok: boolean, reason?: string, details?: object, retryHint?: string }}
 */
export const validateOpeningDiversity = ({ paragraphs } = {}) => {
  const input = Array.isArray(paragraphs) ? paragraphs : [];
  if (input.length < 5) return { ok: true };

  const shapes = input.map((p) => (p?.html ? getOpeningShape(p.html) : "empty"));
  const firstWords = input.map((p) => (p?.html ? getOpeningWord(p.html) : ""));

  // Check 1: Opening shape dominance.
  const shapeCounts = {};
  for (const s of shapes) {
    if (s === "empty") continue;
    shapeCounts[s] = (shapeCounts[s] || 0) + 1;
  }

  const total = shapes.filter((s) => s !== "empty").length;
  if (total >= 5) {
    for (const [shape, count] of Object.entries(shapeCounts)) {
      if (count / total > 0.5) {
        const shapeLabel = shape.replace(/_/g, " ");
        return {
          ok: false,
          reason: "repetitive_openings",
          details: {
            dominantShape: shape,
            count,
            percentage: Math.round((count / total) * 100),
            totalParagraphs: total,
          },
          retryHint:
            `${Math.round((count / total) * 100)}% of paragraphs start with "${shapeLabel}" pattern. ` +
            "Rotate opening shapes: start some with a question, some with a name, " +
            "some with a number, some with a counter-claim (However/But), " +
            "some with a prepositional phrase (In 2024/At the conference).",
        };
      }
    }
  }

  // Check 2: Repetitive first word.
  const wordCounts = {};
  for (const w of firstWords) {
    if (!w || w.length < 3) continue;
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  }

  for (const [word, count] of Object.entries(wordCounts)) {
    if (count > 2) {
      return {
        ok: false,
        reason: "repetitive_first_word",
        details: {
          word,
          count,
          totalParagraphs: total,
        },
        retryHint:
          `"${word}" starts ${count} paragraphs. Vary opening words. ` +
          "Instead of repeating the same word, use synonyms or restructure the sentence.",
      };
    }
  }

  return { ok: true };
};

export default { validateOpeningDiversity };
