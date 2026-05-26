import { useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import { composeSystemPrompt } from "#services/article/personas/loader.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "#utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_CITATION_PERSONA = (() => {
  try {
    const raw = readFileSync(
      path.join(__dirname, "personas", "ai-citation-strategist.md"),
      "utf-8"
    );
    const idx = raw.indexOf("\n---", 3);
    return idx === -1 ? raw.trim() : raw.slice(idx + 4).trim();
  } catch (err) {
    logger.error("ai-citation persona load failed", { message: err.message });
    return "";
  }
})();

const AI_CITATION_SCHEMA = {
  type: "object",
  properties: {
    articleJsonLd: { type: "object" },
    faqJsonLd: { type: "object" },
    entityMentions: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, maxLength: 80 },
          type: {
            type: "string",
            enum: [
              "Organization",
              "Person",
              "Product",
              "Place",
              "Technology",
              "Concept",
              "Event",
            ],
          },
        },
        required: ["name", "type"],
      },
    },
    promptPatterns: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: { type: "string", minLength: 15, maxLength: 200 },
    },
  },
  required: ["articleJsonLd", "faqJsonLd", "entityMentions", "promptPatterns"],
};

/**
 * Produce AI-citation assets for a finalized article (post-SEO stage).
 * Cheap (Haiku, single shot). Persisted on Article.aiCitation.
 */
export const generateAiCitationAssets = async ({
  article,
  workspaceName = "Newsroom MCP",
}) => {
  const seo = article.seo || {};
  const promptInput = {
    title: seo.metaTitle || article.topic,
    slug: seo.slug,
    metaDescription: seo.metaDescription,
    targetKeyword: article.targetKeyword,
    tags: seo.tags || [],
    faq: seo.faq || [],
    bodyExcerpt: (article.contentMarkdown || "").slice(0, 4000),
  };

  const prompt = [
    `Workspace: ${workspaceName}`,
    "",
    `Title: ${promptInput.title}`,
    `Slug: ${promptInput.slug}`,
    `Meta description: ${promptInput.metaDescription}`,
    `Target keyword: ${promptInput.targetKeyword}`,
    `Tags: ${promptInput.tags.join(", ")}`,
    "",
    `FAQ:\n${(promptInput.faq || [])
      .map((f, i) => `Q${i + 1}: ${f.question}\nA${i + 1}: ${f.answer}`)
      .join("\n\n")}`,
    "",
    `Body excerpt:\n${promptInput.bodyExcerpt}`,
    "",
    "Submit AI citation assets via submit_ai_citation.",
  ].join("\n");

  try {
    const result = await useTool({
      model: HAIKU_MODEL,
      system: composeSystemPrompt(AI_CITATION_PERSONA, []),
      prompt,
      toolName: "submit_ai_citation",
      toolDescription:
        "Submit Schema.org JSON-LD bundles + entity mentions + AI prompt patterns for the article.",
      toolInputSchema: AI_CITATION_SCHEMA,
      maxTokens: 2000,
      temperature: 0.3,
    });
    return {
      assets: result.input,
      cost: {
        stageName: "seo",
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
    logger.warn("[ai-citation] generation failed; skipping", {
      message: err.message,
    });
    return { assets: null, cost: null };
  }
};
