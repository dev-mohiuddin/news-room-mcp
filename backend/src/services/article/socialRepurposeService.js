import { useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import { composeSystemPrompt } from "#services/article/personas/loader.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "#utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOCIAL_PERSONA = (() => {
  try {
    const raw = readFileSync(
      path.join(__dirname, "personas", "social-repurposer.md"),
      "utf-8"
    );
    const idx = raw.indexOf("\n---", 3);
    return idx === -1 ? raw.trim() : raw.slice(idx + 4).trim();
  } catch (err) {
    logger.error("social persona load failed", { message: err.message });
    return "";
  }
})();

const SOCIAL_SCHEMA = {
  type: "object",
  properties: {
    twitterThread: {
      type: "array",
      minItems: 5,
      maxItems: 9,
      items: { type: "string", minLength: 20, maxLength: 280 },
    },
    linkedinPost: { type: "string", minLength: 700, maxLength: 1500 },
    instagramCaption: { type: "string", minLength: 150, maxLength: 2200 },
  },
  required: ["twitterThread", "linkedinPost", "instagramCaption"],
};

/**
 * On-demand: rewrite one article into Twitter / LinkedIn / Instagram pieces.
 * Called by route handler `POST /api/v1/articles/:id/social-pack`.
 */
export const generateSocialPack = async ({ article, articleUrl }) => {
  const seo = article.seo || {};
  const prompt = [
    `Title: ${seo.metaTitle || article.topic}`,
    `Target keyword: ${article.targetKeyword}`,
    `Article URL (for the Twitter thread last tweet): ${articleUrl || "(none)"}`,
    `Tags: ${(seo.tags || []).join(", ")}`,
    "",
    "Article body excerpt (use as content reference, not for verbatim copy):",
    (article.contentMarkdown || "").slice(0, 6000),
    "",
    "Submit the social pack via submit_social_pack.",
  ].join("\n");

  const result = await useTool({
    model: HAIKU_MODEL,
    system: composeSystemPrompt(SOCIAL_PERSONA, []),
    prompt,
    toolName: "submit_social_pack",
    toolDescription:
      "Submit a Twitter thread, LinkedIn post, and Instagram caption derived from the article.",
    toolInputSchema: SOCIAL_SCHEMA,
    maxTokens: 2000,
    temperature: 0.6,
  });

  return {
    pack: result.input,
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
};
