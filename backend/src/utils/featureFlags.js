/**
 * ============================================================
 *  Feature Flags — Human-Like Article Pipeline
 * ============================================================
 *
 *  Centralized helper for evaluating environment-driven feature flags
 *  introduced by the human-like-article-pipeline spec.
 *
 *  Semantics (Requirements 6.1, 6.2, 6.9):
 *    - A flag is interpreted as `true` ONLY when its environment variable
 *      is set to the case-insensitive string "true".
 *    - Every other value (unset, empty string, "false", "yes", "1",
 *      arbitrary text, etc.) is interpreted as `false`.
 *    - The value is re-read from `process.env` on EVERY call. There is no
 *      module-level caching, so an operator can flip a flag at runtime
 *      and the next pipeline-stage invocation will observe the new value.
 *
 *  Usage:
 *    import { isFlagEnabled, HUMAN_LIKE_PIPELINE_ENABLED } from "#utils/featureFlags.js";
 *
 *    if (isFlagEnabled(HUMAN_LIKE_PIPELINE_ENABLED)) { ... }
 *    // or, equivalently:
 *    if (isFlagEnabled("HUMAN_LIKE_PIPELINE_ENABLED")) { ... }
 */

/** Master flag — gates all human-like-pipeline behavior. */
export const HUMAN_LIKE_PIPELINE_ENABLED = "HUMAN_LIKE_PIPELINE_ENABLED";

/** Per-stage sub-flag — Source Enrichment Service. */
export const HLP_SOURCE_ENRICH_ENABLED = "HLP_SOURCE_ENRICH_ENABLED";

/** Per-stage sub-flag — Outline Enricher Service. */
export const HLP_OUTLINE_ENRICH_ENABLED = "HLP_OUTLINE_ENRICH_ENABLED";

/** Per-stage sub-flag — Draft Formatter (and Pre-Draft Preparer wiring). */
export const HLP_DRAFT_FORMAT_ENABLED = "HLP_DRAFT_FORMAT_ENABLED";

/** Per-stage sub-flag — SEO Validator hardening. */
export const HLP_SEO_HARDEN_ENABLED = "HLP_SEO_HARDEN_ENABLED";

/** Tone-adaptive temperature + topP sampling for the draft stage. */
export const HLP_TONE_ADAPTIVE_TEMPERATURE = "HLP_TONE_ADAPTIVE_TEMPERATURE";

/** Post-draft burstiness (sentence-length variance) validation. */
export const HLP_BURSTINESS_VALIDATION_ENABLED = "HLP_BURSTINESS_VALIDATION_ENABLED";

/** Post-draft paragraph-length variation validation. */
export const HLP_PARAGRAPH_VARIATION_ENABLED = "HLP_PARAGRAPH_VARIATION_ENABLED";

/** Anti-cliché phrase scanner on generated drafts. */
export const HLP_ANTICLICHE_SCANNER_ENABLED = "HLP_ANTICLICHE_SCANNER_ENABLED";

/** Paragraph opening-pattern diversity validation. */
export const HLP_OPENING_DIVERSITY_ENABLED = "HLP_OPENING_DIVERSITY_ENABLED";

/** Originality/AI-detection gate in the wizard pipeline (after draft, before SEO). */
export const HLP_ORIGINALITY_GATE_ENABLED = "HLP_ORIGINALITY_GATE_ENABLED";

/** Two-pass drafting: Haiku rough draft → Sonnet polish. */
export const HLP_TWO_PASS_DRAFTING_ENABLED = "HLP_TWO_PASS_DRAFTING_ENABLED";

/** Model rotation across Sonnet / Opus / Haiku per article. */
export const HLP_MODEL_ROTATION_ENABLED = "HLP_MODEL_ROTATION_ENABLED";

/** Deep source read: top 3 sources get 5000-char excerpt instead of 2500. */
export const HLP_DEEP_SOURCE_READ_ENABLED = "HLP_DEEP_SOURCE_READ_ENABLED";

/**
 * Evaluate an environment-backed feature flag.
 *
 * Reads `process.env[name]` on every invocation (no caching) and returns
 * `true` if and only if the value is the case-insensitive string `"true"`.
 *
 * @param {string} name - The environment variable name to evaluate.
 * @returns {boolean} `true` when `process.env[name]` is the case-insensitive
 *   string `"true"`; `false` for every other value (unset, empty, "false",
 *   "yes", "1", arbitrary text, non-string types, etc.).
 */
export const isFlagEnabled = (name) => {
  if (typeof name !== "string" || name.length === 0) return false;
  const raw = process.env[name];
  if (typeof raw !== "string") return false;
  return raw.toLowerCase() === "true";
};
