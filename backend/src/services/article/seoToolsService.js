import { generateText, useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import {
  SEO_SPECIALIST_PERSONA,
  composeSystemPrompt,
} from "#services/article/personas/loader.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Standalone SEO Tools — /api/v1/seo/*
 * ============================================================
 *
 *  Powers the SEO Tools page (Meta, Slug, FAQ, Keyword tabs).
 *  Each tool is one Haiku call + light validation. All Anthropic
 *  errors are caught and surfaced as 503 so the frontend can
 *  show a clear toast without crashing.
 *
 *  Slug generation is deterministic (regex-only) — no API call,
 *  no failure mode, no cost.
 */

/* ──────────────────────────────────────────────────────────
 *  Slug — deterministic, no API call.
 *  Re-uses the same algorithm as the pipeline's seoService.
 * ────────────────────────────────────────────────────────── */
const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 75);

export const generateSlug = ({ title }) => {
  const trimmed = String(title || "").trim();
  if (!trimmed) throwError("Title is required", 400);

  const primary = slugify(trimmed);
  if (!primary) throwError("Could not derive a slug from this title", 422);

  /* Build alternatives — long-form, compact, year-stripped */
  const compact = slugify(
    trimmed
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3)
      .join(" ")
  );
  const yearStripped = slugify(trimmed.replace(/\b(19|20)\d{2}\b/g, ""));

  const alternatives = Array.from(
    new Set([compact, yearStripped, `${primary}-guide`].filter((s) => s && s !== primary))
  ).slice(0, 3);

  return { primary, alternatives };
};

/* ──────────────────────────────────────────────────────────
 *  Meta titles + descriptions
 *
 *  Returns 3 titles + 2 descriptions with character counts so
 *  the UI can render the "54 chars" pill without recomputing.
 * ────────────────────────────────────────────────────────── */
const META_SCHEMA = {
  type: "object",
  properties: {
    titles: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string", minLength: 30, maxLength: 60 },
    },
    descriptions: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: { type: "string", minLength: 100, maxLength: 160 },
    },
  },
  required: ["titles", "descriptions"],
};

export const generateMeta = async ({ topic, targetKeyword }) => {
  const trimmedTopic = String(topic || "").trim();
  if (!trimmedTopic) throwError("topic is required", 400);

  const keyword = String(targetKeyword || trimmedTopic).trim();

  try {
    const result = await useTool({
      model: HAIKU_MODEL,
      system: composeSystemPrompt(SEO_SPECIALIST_PERSONA, [
        "TASK: Produce SEO meta assets only.",
        "- 3 meta titles, each 30-60 chars; at least one must contain the target keyword.",
        "- 2 meta descriptions, each 100-160 chars, containing the target keyword exactly once.",
        "- No emoji, no quotes, no clickbait.",
      ]),
      prompt: [
        `Topic / article title: ${trimmedTopic}`,
        `Target keyword: ${keyword}`,
        "",
        "Produce the assets via the submit_meta tool.",
      ].join("\n"),
      toolName: "submit_meta",
      toolDescription: "Submit meta titles and descriptions",
      toolInputSchema: META_SCHEMA,
      maxTokens: 800,
      temperature: 0.6,
    });

    const titles = (result.input?.titles || []).map((text) => ({
      text,
      chars: text.length,
    }));
    const descriptions = (result.input?.descriptions || []).map((text) => ({
      text,
      chars: text.length,
    }));

    return { titles, descriptions, cost: result.cost };
  } catch (err) {
    logger.warn("[seo-tools] meta generation failed", { message: err.message });
    throwError(
      "Meta generation is temporarily unavailable. Please try again shortly.",
      503,
      { code: "SEO_META_UNAVAILABLE" }
    );
  }
};

/* ──────────────────────────────────────────────────────────
 *  FAQ generation — schema-friendly Q&A pairs
 * ────────────────────────────────────────────────────────── */
const FAQ_SCHEMA = {
  type: "object",
  properties: {
    faqs: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          q: { type: "string", minLength: 25, maxLength: 140 },
          a: { type: "string", minLength: 80, maxLength: 320 },
        },
        required: ["q", "a"],
      },
    },
  },
  required: ["faqs"],
};

export const generateFaq = async ({ topic, targetKeyword, context }) => {
  const trimmedTopic = String(topic || "").trim();
  if (!trimmedTopic) throwError("topic is required", 400);

  try {
    const result = await useTool({
      model: HAIKU_MODEL,
      system: composeSystemPrompt(SEO_SPECIALIST_PERSONA, [
        "TASK: Generate FAQ schema-ready Q&A pairs.",
        "- Generate 4-6 pairs covering distinct, non-overlapping questions.",
        "- Question 25-140 chars, ending with a '?'.",
        "- Answer 80-320 chars, factual and specific.",
        "- No marketing fluff, no 'in conclusion'.",
      ]),
      prompt: [
        `Topic: ${trimmedTopic}`,
        `Target keyword: ${targetKeyword || trimmedTopic}`,
        context ? `\nArticle excerpt (truncated):\n${String(context).slice(0, 4000)}` : "",
        "\nProduce the FAQ via the submit_faq tool.",
      ]
        .filter(Boolean)
        .join("\n"),
      toolName: "submit_faq",
      toolDescription: "Submit FAQ Q&A pairs",
      toolInputSchema: FAQ_SCHEMA,
      maxTokens: 1500,
      temperature: 0.5,
    });

    return {
      faqs: result.input?.faqs || [],
      cost: result.cost,
    };
  } catch (err) {
    logger.warn("[seo-tools] FAQ generation failed", { message: err.message });
    throwError(
      "FAQ generation is temporarily unavailable. Please try again shortly.",
      503,
      { code: "SEO_FAQ_UNAVAILABLE" }
    );
  }
};

/* ──────────────────────────────────────────────────────────
 *  Keyword analyzer
 *
 *  We don't ship a real Semrush/DataForSEO contract. Instead
 *  Haiku produces a calibrated estimate and we flag it with
 *  `aiEstimated: true` so the UI can label results clearly.
 *
 *  Future: swap this implementation with a real provider —
 *  the public function signature stays identical.
 * ────────────────────────────────────────────────────────── */
const KEYWORD_SCHEMA = {
  type: "object",
  properties: {
    volume: { type: "integer", minimum: 0, maximum: 5_000_000 },
    difficulty: { type: "integer", minimum: 0, maximum: 100 },
    cpc: { type: "number", minimum: 0, maximum: 1000 },
    intent: {
      type: "string",
      enum: ["Informational", "Navigational", "Commercial", "Transactional"],
    },
    related: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: { type: "string", minLength: 3, maxLength: 80 },
    },
  },
  required: ["volume", "difficulty", "cpc", "intent", "related"],
};

export const analyzeKeyword = async ({ keyword }) => {
  const k = String(keyword || "").trim();
  if (!k) throwError("keyword is required", 400);
  if (k.length > 120) throwError("keyword is too long", 400);

  try {
    const result = await useTool({
      model: HAIKU_MODEL,
      system: composeSystemPrompt(SEO_SPECIALIST_PERSONA, [
        "TASK: Estimate SEO metrics for a keyword.",
        "- volume: realistic monthly searches (US English).",
        "- difficulty: 0-100 ranking difficulty.",
        "- cpc: realistic average $ CPC.",
        "- intent: Informational / Navigational / Commercial / Transactional.",
        "- related: 4-8 close variants, lowercase, no duplicates.",
        "Treat all numbers as honest estimates, not retrieved data.",
      ]),
      prompt: `Keyword: ${k}\n\nSubmit your analysis via the submit_keyword tool.`,
      toolName: "submit_keyword",
      toolDescription: "Submit keyword metrics",
      toolInputSchema: KEYWORD_SCHEMA,
      maxTokens: 600,
      temperature: 0.4,
    });

    const payload = result.input || {};
    return {
      keyword: k,
      volume: Number(payload.volume) || 0,
      difficulty: Number(payload.difficulty) || 0,
      cpc: Number(payload.cpc) || 0,
      intent: payload.intent || "Informational",
      related: Array.isArray(payload.related) ? payload.related : [],
      aiEstimated: true,
      cost: result.cost,
    };
  } catch (err) {
    logger.warn("[seo-tools] keyword analysis failed", { message: err.message });
    throwError(
      "Keyword analysis is temporarily unavailable. Please try again shortly.",
      503,
      { code: "SEO_KEYWORD_UNAVAILABLE" }
    );
  }
};
