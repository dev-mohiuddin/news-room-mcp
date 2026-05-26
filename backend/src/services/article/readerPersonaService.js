import { useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import { composeSystemPrompt } from "#services/article/personas/loader.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "#utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const READER_PERSONA = (() => {
  try {
    const raw = readFileSync(
      path.join(__dirname, "personas", "reader-persona-validator.md"),
      "utf-8"
    );
    const idx = raw.indexOf("\n---", 3);
    return idx === -1 ? raw.trim() : raw.slice(idx + 4).trim();
  } catch (err) {
    logger.error("reader-persona load failed", { message: err.message });
    return "";
  }
})();

const ALLOWED_PERSONAS = [
  "B2B founder/CEO",
  "B2B mid-level decision maker",
  "Individual practitioner",
  "Marketing or content lead",
  "Engineer or developer",
  "Researcher or academic",
  "Casual reader / curious learner",
  "Investor or analyst",
  "Student",
];

const AUDIENCE_SCHEMA = {
  type: "object",
  properties: {
    personaName: { type: "string", enum: ALLOWED_PERSONAS },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rationale: { type: "string", minLength: 20, maxLength: 280 },
    draftingHints: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string", minLength: 10, maxLength: 200 },
    },
  },
  required: ["personaName", "confidence", "rationale", "draftingHints"],
};

/**
 * Quick one-shot audience classification (Haiku, low-cost).
 * Returns { personaName, confidence, draftingHints, rationale } or null
 * if the call fails (caller proceeds with default tone/style).
 */
export const classifyReaderPersona = async ({
  topic,
  targetKeyword,
  tone,
  additionalKeywords = [],
}) => {
  const prompt = [
    `Topic: ${topic}`,
    `Target keyword: ${targetKeyword}`,
    `Author-chosen tone: ${tone}`,
    additionalKeywords.length
      ? `Additional keywords: ${additionalKeywords.join(", ")}`
      : null,
    "",
    "Pick the single most likely audience and submit via submit_audience.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await useTool({
      model: HAIKU_MODEL,
      system: composeSystemPrompt(READER_PERSONA, []),
      prompt,
      toolName: "submit_audience",
      toolDescription:
        "Submit the inferred audience persona for the article along with drafting hints.",
      toolInputSchema: AUDIENCE_SCHEMA,
      maxTokens: 500,
      temperature: 0.2,
    });
    return {
      ...result.input,
      cost: result.cost,
      latencyMs: result.latencyMs,
      model: result.model,
      usage: result.usage,
    };
  } catch (err) {
    logger.warn("[reader-persona] classification failed; defaulting", {
      message: err.message,
    });
    return null;
  }
};

/**
 * Build a tight hint block the Drafter system-prompt appends.
 */
export const buildAudienceBlock = (audience) => {
  if (!audience?.personaName || (audience.confidence ?? 0) < 0.6) return "";
  return [
    "# READER PERSONA (the one human you are writing to)",
    `Primary audience: ${audience.personaName} (confidence ${audience.confidence.toFixed(2)}).`,
    `Rationale: ${audience.rationale}`,
    "Drafting hints:",
    ...(audience.draftingHints || []).map((h) => `- ${h}`),
  ].join("\n");
};
