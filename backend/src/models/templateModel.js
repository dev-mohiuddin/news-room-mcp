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
  },
  { timestamps: true, versionKey: false }
);

templateSchema.index({ workspaceId: 1, createdAt: -1 });
templateSchema.index({ workspaceId: 1, name: 1 });

export const Template = mongoose.model("Template", templateSchema);
export default Template;
