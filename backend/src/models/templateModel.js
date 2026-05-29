import mongoose from "mongoose";

/**
 * Article Template — workspace-scoped reusable prompt + structure.
 *
 *  Used by /dashboard/templates (CRUD UI) and consumed by the
 *  "New Article" page to pre-fill topic / target word count /
 *  description before calling /api/v1/articles/generate.
 */
const templateSchema = new mongoose.Schema(
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
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    category: { type: String, default: "General", trim: true, maxlength: 60 },
    targetWordCount: { type: Number, default: 1500, min: 200, max: 6000 },
    uses: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },

    /**
     * Preset fields applied to a new article when this template is
     * selected on `POST /articles/wizard/start`. All optional — the
     * wizard falls back to its own defaults when a field is empty.
     */
    tonePreset: {
      type: String,
      enum: ["Professional", "Casual", "Journalistic", "Academic", null],
      default: null,
    },
    additionalKeywords: { type: [String], default: [] },
    /**
     * Optional outline scaffold. Stored in the same shape as
     * `articleSchema.outline` so the wizard can use it directly. When
     * present, the outline stage is skipped — the user can still edit
     * sections via the standard PATCH endpoints.
     */
    outlinePreset: {
      type: [
        new mongoose.Schema(
          {
            heading: { type: String, required: true },
            subPoints: { type: [String], default: [] },
            estimatedWordCount: { type: Number, default: 250 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    brandVoiceProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrandVoiceProfile",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

templateSchema.index({ workspaceId: 1, createdAt: -1 });
templateSchema.index({ workspaceId: 1, name: 1 });

export const Template = mongoose.model("Template", templateSchema);
export default Template;
