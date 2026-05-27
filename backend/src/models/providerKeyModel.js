import mongoose from "mongoose";

/**
 * Provider Key Override — workspace-scoped third-party API keys.
 *
 *   When a workspace plugs in their own Anthropic / OpenAI / Brave
 *   key, the AI services prefer this key over the platform default,
 *   so the workspace bills the provider directly.
 *
 *   The raw key is encrypted at rest with AES-256-GCM
 *   (utils/encryptionUtil.js). Only a masked preview is exposed via
 *   the API; the plaintext value is never returned after creation.
 *
 *   One record per (workspace, provider). Updates rotate the secret
 *   in-place; deleting the record falls back to the platform key.
 */
const providerKeySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ["anthropic", "openai", "brave"],
      index: true,
    },
    label: { type: String, default: "", trim: true, maxlength: 120 },
    encryptedKey: { type: String, required: true, select: false },
    maskedPreview: { type: String, required: true },
    lastTestedAt: { type: Date, default: null },
    lastTestStatus: {
      type: String,
      enum: ["unknown", "ok", "failed"],
      default: "unknown",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

providerKeySchema.index({ workspaceId: 1, provider: 1 }, { unique: true });

export const ProviderKey = mongoose.model("ProviderKey", providerKeySchema);
export default ProviderKey;
