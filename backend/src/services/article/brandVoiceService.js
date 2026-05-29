import { useTool, HAIKU_MODEL } from "#services/external/anthropicClient.js";
import {
  composeSystemPrompt,
} from "#services/article/personas/loader.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "#utils/logger.js";
import {
  createProfile,
  updateProfile,
  findProfileById,
} from "#repositories/brandVoiceRepository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the brand-voice persona once at module init.
const BRAND_VOICE_PERSONA = (() => {
  try {
    const fullPath = path.join(
      __dirname,
      "personas",
      "brand-voice-guardian.md"
    );
    const raw = readFileSync(fullPath, "utf-8");
    const idx = raw.indexOf("\n---", 3);
    return idx === -1 ? raw.trim() : raw.slice(idx + 4).trim();
  } catch (err) {
    logger.error("brand-voice persona load failed", { message: err.message });
    return "";
  }
})();

const VOICE_PROFILE_SCHEMA = {
  type: "object",
  properties: {
    toneSummary: { type: "string", minLength: 10, maxLength: 400 },
    sentenceRhythm: { type: "string", minLength: 10, maxLength: 200 },
    vocabularyLevel: {
      type: "string",
      enum: ["simple", "accessible", "technical", "academic"],
    },
    voiceTraits: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: { type: "string", minLength: 3, maxLength: 80 },
    },
    signaturePhrases: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string", minLength: 2, maxLength: 120 },
    },
    avoidList: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string", minLength: 2, maxLength: 80 },
    },
  },
  required: [
    "toneSummary",
    "sentenceRhythm",
    "vocabularyLevel",
    "voiceTraits",
    "signaturePhrases",
    "avoidList",
  ],
};

/**
 * Run extraction on the saved samples of a profile and persist the result.
 * Returns the updated profile.
 */
export const extractAndSaveVoiceProfile = async ({
  workspaceId,
  profileId,
}) => {
  const doc = await findProfileById(workspaceId, profileId);
  if (!doc) throw new Error("Brand voice profile not found");
  if (!doc.samples?.length) throw new Error("No samples uploaded");

  const samplesBlock = doc.samples
    .map(
      (s, i) =>
        `[Sample ${i + 1}] ${s.title || "(untitled)"}\n${(s.text || "").slice(
          0,
          8_000
        )}`
    )
    .join("\n\n---\n\n");

  const prompt = `Profile name: ${doc.name}\n\nSamples (3 to 5 articles):\n\n${samplesBlock}\n\nExtract the voice profile via the submit_voice_profile tool.`;

  const result = await useTool({
    model: HAIKU_MODEL,
    system: composeSystemPrompt(BRAND_VOICE_PERSONA, [
      "OUTPUT CONTRACT:",
      "- Submit ONE profile through submit_voice_profile.",
      "- Every observation must be present in the samples.",
    ]),
    prompt,
    toolName: "submit_voice_profile",
    toolDescription:
      "Submit the structured brand voice profile inferred from the supplied samples.",
    toolInputSchema: VOICE_PROFILE_SCHEMA,
    maxTokens: 1500,
    temperature: 0.2,
  });

  const updated = await updateProfile(workspaceId, profileId, {
    profile: result.input,
    extractedAt: new Date(),
  });
  return updated;
};

/**
 * Build a runtime "voice block" string the Article Drafter system prompt
 * can append. Returns empty string when no active profile.
 */
export const buildVoiceBlock = (profile) => {
  if (!profile?.profile?.toneSummary) return "";
  const p = profile.profile;
  const blocks = [
    "# BRAND VOICE — must follow throughout the draft",
    `Profile name: ${profile.name}`,
    `Tone: ${p.toneSummary}`,
    `Sentence rhythm: ${p.sentenceRhythm}`,
    `Vocabulary level: ${p.vocabularyLevel}`,
    `Voice traits: ${(p.voiceTraits || []).join(", ")}`,
    p.signaturePhrases?.length
      ? `Signature phrases (use sparingly, never force): ${p.signaturePhrases.join(" | ")}`
      : "",
    p.avoidList?.length
      ? `AVOID: ${p.avoidList.join(" | ")}`
      : "",
  ];

  /* ── Optional few-shot writing samples ──
   * When the profile has saved samples, inject the first 1-2 as concrete
   * examples of the desired writing style. This gives the model a direct
   * reference for sentence rhythm, vocabulary, and voice traits.
   */
  if (profile.samples?.length) {
    const sampleTexts = profile.samples
      .slice(0, 2)
      .map((s, i) => `[Example ${i + 1}: ${s.title || "untitled"}]\n${(s.text || "").slice(0, 1500)}`)
      .join("\n\n");
    if (sampleTexts) {
      blocks.push("", "# WRITING EXAMPLES — emulate this style", sampleTexts);
    }
  }

  return blocks.filter(Boolean).join("\n");
};

export const seedAndExtract = async ({
  workspaceId,
  userId,
  name,
  description,
  samples,
}) => {
  const profile = await createProfile(workspaceId, {
    createdBy: userId,
    name,
    description: description || "",
    samples,
    isActive: false,
  });
  return extractAndSaveVoiceProfile({
    workspaceId,
    profileId: profile._id,
  });
};
