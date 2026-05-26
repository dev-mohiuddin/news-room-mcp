import mongoose from "mongoose";

/**
 * ============================================================
 *  CmsConnection Model — Requirement 8
 * ============================================================
 *
 *  Stores credentials for a tenant's CMS site.
 *  - `provider` is `wordpress` for MVP; future Ghost/Notion/Contentful/Sanity.
 *  - The application password is encrypted at rest using AES-256-GCM
 *    (encryptionUtil.encrypt) and persisted as `iv:tag:ciphertext` base64.
 *  - The plaintext password NEVER travels in API responses.
 */

const cmsConnectionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["wordpress"], // future: "ghost", "notion", "contentful", "sanity"
      required: true,
    },
    siteUrl: { type: String, required: true },
    username: { type: String, required: true },
    /* Encrypted application password — never returned by API. */
    passwordEncrypted: {
      type: String,
      required: true,
      select: false,
    },
    /* Optional display label for the workspace UI */
    label: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    lastTestedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

/* Compound indexes — NFR6 */
cmsConnectionSchema.index({ workspaceId: 1, _id: 1 });
cmsConnectionSchema.index({ workspaceId: 1, createdAt: -1 });
// Filter by provider within a workspace (settings UI)
cmsConnectionSchema.index({ workspaceId: 1, provider: 1 });
// siteUrl + workspace uniqueness for de-dup checks
cmsConnectionSchema.index({ workspaceId: 1, siteUrl: 1 });
// Only one default connection per workspace.
cmsConnectionSchema.index(
  { workspaceId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

cmsConnectionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordEncrypted;
    return ret;
  },
});

export const CmsConnection = mongoose.model("CmsConnection", cmsConnectionSchema);
export default CmsConnection;
