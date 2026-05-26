import { useTool, SONNET_MODEL } from "#services/external/anthropicClient.js";
import {
  OUTLINE_ARCHITECT_PERSONA,
  composeSystemPrompt,
} from "#services/article/personas/loader.js";
import { logger } from "#utils/logger.js";

/**
 * ============================================================
 *  Outline stage — Requirement 3
 * ============================================================
 *
 *  - Tool-use call to Sonnet returns { sections: [...] }
 *  - 4–10 sections, each: heading 1–120 chars, 2–6 subPoints (1–200 chars),
 *    estimatedWordCount > 0
 *  - Sum of estimatedWordCount within ±10% of targetWordCount
 *  - 2 retries before failing with OUTLINE_PARSE_FAILED
 */

export const OUTLINE_PROMPT_VERSION = "v1";

const OUTLINE_TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      minItems: 4,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          heading: { type: "string", minLength: 1, maxLength: 120 },
          subPoints: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: { type: "string", minLength: 1, maxLength: 200 },
          },
          estimatedWordCount: { type: "integer", minimum: 50, maximum: 1500 },
        },
        required: ["heading", "subPoints", "estimatedWordCount"],
      },
    },
  },
  required: ["sections"],
};

const buildPrompt = ({ topic, targetKeyword, tone, targetWordCount, brief }) => {
  const bullets = (brief?.summaryBullets || [])
    .map((b, i) => `${i + 1}. ${b.text}`)
    .join("\n");
  const sources = (brief?.sources || [])
    .filter((s) => !s.skipReason)
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title || s.url}\n${s.url}\nExcerpt:\n${(s.cleanedMarkdown || "").slice(0, 1500)}`
    )
    .join("\n\n");

  return [
    `Topic: ${topic}`,
    `Target keyword: ${targetKeyword}`,
    `Writing tone: ${tone}`,
    `Target total word count: ${targetWordCount}`,
    "",
    "Research bullets:",
    bullets || "(none)",
    "",
    "Source excerpts:",
    sources,
    "",
    "Produce a structured outline as 4–10 sections. The sum of estimatedWordCount values must be within ±10% of the target total word count. Each section should have a clear, action-oriented heading and 2–6 sub-points capturing what the section will cover.",
  ].join("\n");
};

const validateOutline = (outline, targetWordCount) => {
  if (!outline?.sections?.length) {
    return { ok: false, reason: "no_sections" };
  }
  const sections = outline.sections;
  if (sections.length < 4 || sections.length > 10) {
    return { ok: false, reason: "section_count_out_of_range" };
  }
  for (const s of sections) {
    if (
      !s.heading ||
      typeof s.heading !== "string" ||
      s.heading.length > 120
    ) {
      return { ok: false, reason: "bad_heading" };
    }
    if (
      !Array.isArray(s.subPoints) ||
      s.subPoints.length < 2 ||
      s.subPoints.length > 6
    ) {
      return { ok: false, reason: "bad_subpoints" };
    }
    if (
      !Number.isInteger(s.estimatedWordCount) ||
      s.estimatedWordCount <= 0
    ) {
      return { ok: false, reason: "bad_word_count" };
    }
  }
  const total = sections.reduce((acc, s) => acc + s.estimatedWordCount, 0);
  const lower = targetWordCount * 0.9;
  const upper = targetWordCount * 1.1;
  if (total < lower || total > upper) {
    return { ok: false, reason: "word_count_drift", total };
  }
  return { ok: true };
};

export const runOutlineStage = async ({
  topic,
  targetKeyword,
  tone,
  targetWordCount,
  brief,
}) => {
  let lastError = null;
  let lastUsage = null;
  let totalUsd = 0;
  let totalLatency = 0;
  let lastModel = SONNET_MODEL;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await useTool({
        model: SONNET_MODEL,
        system: composeSystemPrompt(OUTLINE_ARCHITECT_PERSONA, [
          "RUNTIME CONSTRAINTS (must satisfy in addition to the persona rules):",
          `- Target total word count: ${targetWordCount} (sum of estimatedWordCount must be ±10%).`,
          `- Tone: ${tone}.`,
          "- Submit exactly one outline through the submit_outline tool.",
        ]),
        prompt: buildPrompt({
          topic,
          targetKeyword,
          tone,
          targetWordCount,
          brief,
        }),
        toolName: "submit_outline",
        toolDescription:
          "Submit the article outline. Provide 4-10 sections with sub-points and estimated word counts whose total is ±10% of the target.",
        toolInputSchema: OUTLINE_TOOL_INPUT_SCHEMA,
        maxTokens: 2048,
        temperature: 0.4,
      });
      lastModel = result.model;
      lastUsage = result.usage;
      totalUsd += result.cost?.usdCost || 0;
      totalLatency += result.latencyMs || 0;

      const validation = validateOutline(result.input, targetWordCount);
      if (validation.ok) {
        return {
          outline: result.input.sections,
          promptVersion: OUTLINE_PROMPT_VERSION,
          cost: {
            stageName: "outline",
            providerName: "anthropic",
            model: lastModel,
            promptTokens: lastUsage?.promptTokens || 0,
            completionTokens: lastUsage?.completionTokens || 0,
            unitsConsumed:
              (lastUsage?.promptTokens || 0) + (lastUsage?.completionTokens || 0),
            usdCost: result.cost?.usdCost || 0,
            costFlagged: result.cost?.flagged || false,
            latencyMs: result.latencyMs || 0,
            ts: new Date(),
          },
        };
      }
      lastError = validation;
      logger.warn("[outline] validation failed; retrying", validation);
    } catch (err) {
      lastError = { reason: "exception", message: err.message };
      logger.warn("[outline] tool-use call failed; retrying", {
        message: err.message,
      });
    }
  }

  const err = new Error("Outline generation failed after retries");
  err.code = "OUTLINE_PARSE_FAILED";
  err.details = lastError;
  err.totalUsd = totalUsd;
  err.totalLatency = totalLatency;
  throw err;
};
