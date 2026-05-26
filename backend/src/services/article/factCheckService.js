import { useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import { composeSystemPrompt } from "#services/article/personas/loader.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToPlain } from "#utils/textUtil.js";
import { logger } from "#utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FACT_CHECKER_PERSONA = (() => {
  try {
    const raw = readFileSync(
      path.join(__dirname, "personas", "fact-checker.md"),
      "utf-8"
    );
    const idx = raw.indexOf("\n---", 3);
    return idx === -1 ? raw.trim() : raw.slice(idx + 4).trim();
  } catch (err) {
    logger.error("fact-checker persona load failed", { message: err.message });
    return "";
  }
})();

const FACT_CHECK_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["pass", "revise"] },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          paragraphIndex: { type: "integer", minimum: 0 },
          quote: { type: "string", minLength: 5, maxLength: 280 },
          severity: { type: "string", enum: ["blocker", "warning", "nit"] },
          reason: { type: "string", minLength: 10, maxLength: 280 },
          suggestedFix: { type: "string", maxLength: 280 },
        },
        required: ["paragraphIndex", "quote", "severity", "reason"],
      },
      default: [],
    },
    summary: { type: "string", minLength: 10, maxLength: 280 },
  },
  required: ["verdict", "flags", "summary"],
};

/**
 * Audit the freshly assembled draft against the research brief.
 * Cheap (Haiku) — runs once per draft, returns a verdict + flags.
 *
 * Caller should:
 *   - On `pass`: continue to SEO stage normally
 *   - On `revise` with blockers: mark article needs_revision (recoverable)
 *   - Persist the report on Article.factCheck so the UI can show it
 */
export const runFactCheck = async ({
  paragraphs = [],
  brief,
}) => {
  const factualParagraphs = paragraphs
    .map((p, idx) => ({ ...p, idx }))
    .filter((p) => p.tag === "factual");

  if (factualParagraphs.length === 0) {
    return {
      report: {
        verdict: "pass",
        flags: [],
        summary: "No factual paragraphs to check.",
      },
      cost: null,
    };
  }

  const sourcesBlock = (brief?.sources || [])
    .filter((s) => !s.skipReason)
    .map(
      (s, i) =>
        `[${i + 1}] ${s.url}\nTitle: ${s.title || "(no title)"}\nExcerpt:\n${(s.cleanedMarkdown || "").slice(0, 2000)}`
    )
    .join("\n\n---\n\n");

  const paragraphsBlock = factualParagraphs
    .map((p) => `Paragraph ${p.idx}: ${htmlToPlain(p.html)}`)
    .join("\n\n");

  const prompt = [
    "Cross-check every factual claim in the paragraphs below against the",
    "supplied source excerpts. Submit your audit via submit_fact_check.",
    "",
    "SOURCES (the ONLY allowed evidence):",
    sourcesBlock || "(none)",
    "",
    "FACTUAL PARAGRAPHS TO AUDIT:",
    paragraphsBlock,
  ].join("\n");

  try {
    const result = await useTool({
      model: HAIKU_MODEL,
      system: composeSystemPrompt(FACT_CHECKER_PERSONA, []),
      prompt,
      toolName: "submit_fact_check",
      toolDescription:
        "Submit the fact-check verdict, flags, and summary for the article paragraphs.",
      toolInputSchema: FACT_CHECK_SCHEMA,
      maxTokens: 1500,
      temperature: 0.1,
    });
    return {
      report: result.input,
      cost: {
        stageName: "draft",
        providerName: "anthropic",
        model: result.model,
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        unitsConsumed:
          (result.usage?.promptTokens || 0) +
          (result.usage?.completionTokens || 0),
        usdCost: result.cost?.usdCost || 0,
        costFlagged: result.cost?.flagged || false,
        latencyMs: result.latencyMs || 0,
        ts: new Date(),
      },
    };
  } catch (err) {
    logger.warn("[fact-check] failed; defaulting to pass", { message: err.message });
    return {
      report: {
        verdict: "pass",
        flags: [],
        summary: `Fact-check unavailable: ${err.message}`,
      },
      cost: null,
    };
  }
};
