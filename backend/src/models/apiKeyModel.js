import mongoose from "mongoose";

/**
 * Personal API Key — workspace-scoped programmatic access tokens.
 *
 *   - Generated as `nrm_live_<32 random chars>`
 *   - Only the SHA-256 hash is stored (never the raw secret)
 *   - The `keyPrefix` (first 12 chars) is shown in the UI for identification
 *   - Plaintext is returned ONCE at creation time only
 */
const apiKeySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    keyPrefix: { type: String, required: true, index: true },
    keyHash: { type: String, required: true, select: false },
    scope: {
      type: String,
      enum: ["all", "read", "articles", "research"],
      default: "all",
    },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

apiKeySchema.index({ workspaceId: 1, createdAt: -1 });
apiKeySchema.index({ keyPrefix: 1, revokedAt: 1 });

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
export default ApiKey;
