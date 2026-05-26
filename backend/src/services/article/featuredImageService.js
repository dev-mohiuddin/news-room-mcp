import { useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import { composeSystemPrompt } from "#services/article/personas/loader.js";
import { searchUnsplash } from "#services/external/unsplashClient.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import { logger } from "#utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_PERSONA = (() => {
  try {
    const raw = readFileSync(
      path.join(__dirname, "personas", "image-prompt-engineer.md"),
      "utf-8"
    );
    const idx = raw.indexOf("\n---", 3);
    return idx === -1 ? raw.trim() : raw.slice(idx + 4).trim();
  } catch (err) {
    logger.error("image persona load failed", { message: err.message });
    return "";
  }
})();

const IMAGE_BRIEF_SCHEMA = {
  type: "object",
  properties: {
    aiPrompt: { type: "string", minLength: 30, maxLength: 600 },
    altText: { type: "string", minLength: 10, maxLength: 125 },
    unsplashQuery: { type: "string", minLength: 4, maxLength: 80 },
  },
  required: ["aiPrompt", "altText", "unsplashQuery"],
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const TARGET_WIDTH = 1600;

/**
 * Step 1 — generate the image brief (prompt + alt + Unsplash query).
 * Cheap (Haiku one-shot).
 */
export const generateImageBrief = async ({ article }) => {
  const seo = article.seo || {};
  const prompt = [
    `Title: ${seo.metaTitle || article.topic}`,
    `Target keyword: ${article.targetKeyword}`,
    seo.metaDescription ? `Description: ${seo.metaDescription}` : "",
    `Tags: ${(seo.tags || []).join(", ")}`,
    "",
    "Submit the image brief via submit_image_brief.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await useTool({
    model: HAIKU_MODEL,
    system: composeSystemPrompt(IMAGE_PERSONA, []),
    prompt,
    toolName: "submit_image_brief",
    toolDescription:
      "Submit AI prompt, alt text, and Unsplash search query for the article hero image.",
    toolInputSchema: IMAGE_BRIEF_SCHEMA,
    maxTokens: 600,
    temperature: 0.6,
  });

  return {
    brief: result.input,
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

/**
 * Step 2a — search Unsplash with the engineered query.
 */
export const searchHeroImageOnUnsplash = async ({ query }) =>
  searchUnsplash({ query, perPage: 9 });

/**
 * Step 2b — given a chosen URL (from Unsplash or upload), download → resize
 * → upload to Cloudinary, return persistable featuredImage shape.
 *
 * `source` is "unsplash" or "upload"; `attribution` is set for Unsplash only.
 */
export const ingestAndStoreImage = async ({
  workspaceId,
  imageUrl,
  buffer,
  source = "upload",
  attribution = null,
  alt = "",
}) => {
  let inputBuffer = buffer;
  if (!inputBuffer && imageUrl) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    inputBuffer = Buffer.from(arrayBuffer);
  }
  if (!inputBuffer) throw new Error("No image buffer or URL supplied");
  if (inputBuffer.byteLength > MAX_IMAGE_BYTES) {
    const err = new Error("Image exceeds 10MB limit");
    err.code = "IMAGE_TOO_LARGE";
    throw err;
  }

  // Resize while preserving aspect ratio. Re-encode as WebP for smaller payloads.
  const resized = await sharp(inputBuffer)
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  // Cloudinary upload via stream
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `newsroom/${workspaceId}/featured`,
        resource_type: "image",
        format: "webp",
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(resized);
  });

  return {
    url: uploadResult.secure_url,
    alt: alt || "",
    source,
    sourceAttribution: attribution || null,
    cloudinaryPublicId: uploadResult.public_id,
    width: uploadResult.width,
    height: uploadResult.height,
  };
};

export const SUPPORTED_MIMES = ["image/jpeg", "image/png", "image/webp"];
