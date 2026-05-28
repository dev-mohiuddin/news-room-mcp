import Anthropic from "@anthropic-ai/sdk";
import { logger } from "#utils/logger.js";
import { computeUsdCost } from "#constants/modelCosts.js";
import { getProviderConfig } from "#services/system/integrationService.js";

/**
 * ============================================================
 *  Anthropic SDK wrapper
 * ============================================================
 *
 *  Returns { text, parsed, usage, model, latencyMs, cost } where
 *  `parsed` is the JSON parse of `text` if `responseFormat = "json"`.
 *
 *  Tool-use is invoked via `useTool({ tools, toolName, … })` so callers
 *  receive structured output directly without prompt-engineering a
 *  "respond with JSON only" instruction.
 *
 *  Key resolution:
 *    1. Admin-managed integration record (integrationService cache, 10s)
 *    2. ANTHROPIC_API_KEY env var
 *  We re-instantiate the SDK if the resolved key changes — admins can
 *  rotate keys live without restarting the API.
 */

let clientSingleton = null;
let lastKeyHash = null;

const hashKey = (k) => {
  if (!k) return null;
  return `${k.slice(0, 8)}:${k.length}`;
};

const resolveKey = async () => {
  try {
    const cfg = await getProviderConfig("anthropic");
    if (cfg?.apiKey) return cfg.apiKey;
  } catch {
    /* fall through to env */
  }
  return process.env.ANTHROPIC_API_KEY || null;
};

const getClient = async () => {
  const apiKey = await resolveKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const sig = hashKey(apiKey);
  if (clientSingleton && lastKeyHash === sig) return clientSingleton;
  clientSingleton = new Anthropic({ apiKey });
  lastKeyHash = sig;
  return clientSingleton;
};

export const SONNET_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
export const HAIKU_MODEL =
  process.env.ANTHROPIC_HAIKU_MODEL || "claude-haiku-4-5-20251001";

/**
 * Plain text completion. Best for SEO snippets, alt text, short summaries.
 */
export const generateText = async ({
  model = HAIKU_MODEL,
  system,
  prompt,
  maxTokens = 1024,
  temperature = 0.7,
  stopSequences,
} = {}) => {
  const client = await getClient();
  const start = Date.now();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    stop_sequences: stopSequences,
    messages: [{ role: "user", content: prompt }],
  });
  const latencyMs = Date.now() - start;
  const text = response.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  const usage = {
    promptTokens: response.usage?.input_tokens || 0,
    completionTokens: response.usage?.output_tokens || 0,
  };
  const { usdCost, flagged } = computeUsdCost(
    model,
    usage.promptTokens,
    usage.completionTokens
  );

  return { text, model, usage, latencyMs, cost: { usdCost, flagged } };
};

/**
 * Structured tool-use. Returns the parsed object the model emitted.
 *
 *   const { input } = await useTool({
 *     toolName: "submit_outline",
 *     toolDescription: "Submit the outline JSON",
 *     toolInputSchema: { type: "object", properties: {...}, required: [...] },
 *     system, prompt
 *   });
 */
export const useTool = async ({
  model = SONNET_MODEL,
  system,
  prompt,
  toolName,
  toolDescription,
  toolInputSchema,
  maxTokens = 4096,
  temperature = 0.4,
} = {}) => {
  const client = await getClient();
  const start = Date.now();

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    tools: [
      {
        name: toolName,
        description: toolDescription,
        input_schema: toolInputSchema,
      },
    ],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: prompt }],
  });

  const latencyMs = Date.now() - start;
  const toolUse = response.content?.find((block) => block.type === "tool_use");

  if (!toolUse) {
    logger.error("Anthropic returned no tool_use block", {
      stopReason: response.stop_reason,
      contentTypes: response.content?.map((b) => b.type),
    });
    throw new Error("Anthropic returned no tool_use block");
  }

  const usage = {
    promptTokens: response.usage?.input_tokens || 0,
    completionTokens: response.usage?.output_tokens || 0,
  };
  const { usdCost, flagged } = computeUsdCost(
    model,
    usage.promptTokens,
    usage.completionTokens
  );

  return {
    input: toolUse.input,
    raw: response,
    model,
    usage,
    latencyMs,
    cost: { usdCost, flagged },
  };
};
