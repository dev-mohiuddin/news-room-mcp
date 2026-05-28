import mongoose from "mongoose";

/**
 * Global Admin Integration — platform-wide third-party API key entry.
 *
 *   - One document per provider key (anthropic, brave, stripe, …).
 *   - The plaintext value(s) are encrypted at rest with AES-256-GCM
 *     via `utils/encryptionUtil.js`. Only a masked preview is exposed.
 *   - `secrets` is a Map<string, encrypted-string> so providers that
 *     need multiple values (e.g. SMTP host/port/user/pass) can store
 *     them under one document.
 *
 *   Provider precedence at runtime:
 *     1. Per-workspace ProviderKey override (TASK 3)
 *     2. This DB record (admin integrations)
 *     3. Process env (`.env`) — final fallback
 *
 *  An "isActive=false" record is treated as not configured, so admins
 *  can park a key without rotating it out.
 */

export const SUPPORTED_INTEGRATION_PROVIDERS = [
  "anthropic",
  "brave",
  "exa",
  "stripe",
  "cloudinary",
  "smtp",
  "dataforseo",
  "firecrawl",
  "jina",
];

const integrationSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: SUPPORTED_INTEGRATION_PROVIDERS,
      unique: true,
      index: true,
    },
    /**
     *  Provider-specific encrypted secret bundle. Examples:
     *    - anthropic / brave / exa / dataforseo:  { apiKey: <enc> }
     *    - stripe:                                 { secretKey, webhookSecret, publishableKey? }
     *    - cloudinary:                             { cloudName, apiKey, apiSecret }
     *    - smtp:                                   { host, port, user, pass, from }
     *    - firecrawl / jina:                       { apiKey }
     *
     *  Plain string values can be stored too (legacy single-key case),
     *  but the Map shape gives the UI a stable contract.
     */
    secrets: {
      type: Map,
      of: String,
      default: () => new Map(),
      select: false,
    },
    /**
     *  Public, non-secret metadata derived from the secret. The UI uses
     *  this for the "edit key" dialog so it never needs to read the
     *  encrypted bundle.
     */
    publicMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    /** Masked preview, e.g. "sk-ant-…7Q9c". Always safe to render. */
    maskedPreview: { type: String, required: true },
    /** Optional admin-set label (e.g. "Production Anthropic"). */
    label: { type: String, default: "", trim: true, maxlength: 120 },
    /** Soft-disable without rotating out the secret. */
    isActive: { type: Boolean, default: true, index: true },
    /** Test-connection result tracking. */
    lastTestedAt: { type: Date, default: null },
    lastTestStatus: {
      type: String,
      enum: ["unknown", "ok", "failed"],
      default: "unknown",
    },
    lastTestError: { type: String, default: null },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

export const Integration = mongoose.model("Integration", integrationSchema);
export default Integration;
