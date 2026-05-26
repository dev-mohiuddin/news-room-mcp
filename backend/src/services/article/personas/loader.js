import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Persona Loader — Phase A
 * ============================================================
 *
 *  Distilled "agent persona" markdown files that drive the system
 *  prompt for each LLM-backed pipeline stage.
 *
 *  Why distilled (not raw agency-agents-main personas)?
 *   - Full personas are 2,000+ tokens of overhead per call
 *   - At Sonnet $0.003 / 1k input tokens × 5 stages × 1000 generations
 *     = ~$30/mo PURE PROMPT OVERHEAD without quality lift
 *   - These distilled versions keep the most actionable rules + voice
 *     and drop the deliverable templates that don't apply at runtime
 *
 *  Loaded once at module import; cached by filename.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERSONA_DIR = __dirname;

/** Read a persona file synchronously (called once at boot per persona). */
const readPersona = (filename) => {
  try {
    const fullPath = path.join(PERSONA_DIR, filename);
    const raw = readFileSync(fullPath, "utf-8");
    return stripFrontMatter(raw).trim();
  } catch (err) {
    logger.error(`Persona file failed to load: ${filename}`, {
      message: err.message,
    });
    return ""; // empty fallback — service will use its built-in mini-prompt
  }
};

/** Strip YAML front-matter (--- ... ---) so it never leaks into prompts. */
const stripFrontMatter = (raw) => {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  return raw.slice(end + 4);
};

/* ── Public personas (one-shot load on import) ── */

export const RESEARCH_SUMMARIZER_PERSONA = readPersona(
  "research-summarizer.md"
);
export const OUTLINE_ARCHITECT_PERSONA = readPersona("outline-architect.md");
export const ARTICLE_DRAFTER_PERSONA = readPersona("article-drafter.md");
export const SEO_SPECIALIST_PERSONA = readPersona("seo-specialist.md");

/**
 * Compose a final system prompt by appending optional pipeline-time
 * constraints (word counts, allowed source URLs, etc.) AFTER the persona.
 *
 *   composeSystemPrompt(OUTLINE_ARCHITECT_PERSONA, [
 *     "OUTPUT CONSTRAINTS:",
 *     "- 4-10 sections",
 *     "- Word total ±10% of target",
 *   ])
 */
export const composeSystemPrompt = (persona, lines = []) => {
  const tail = Array.isArray(lines) ? lines.filter(Boolean).join("\n") : "";
  if (!persona) return tail;
  if (!tail) return persona;
  return `${persona}\n\n---\n\n${tail}`;
};

export const personaInfo = () => ({
  research: RESEARCH_SUMMARIZER_PERSONA.length,
  outline: OUTLINE_ARCHITECT_PERSONA.length,
  drafter: ARTICLE_DRAFTER_PERSONA.length,
  seo: SEO_SPECIALIST_PERSONA.length,
});
