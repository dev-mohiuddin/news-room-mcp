import mongoose from "mongoose";

/**
 * BrandVoiceProfile — captures a workspace's writing style.
 *
 *  - User uploads 3-5 sample articles (plain text)
 *  - We extract a structured "voice profile" via Claude Haiku
 *  - The draft stage reads the active profile and injects it into the prompt
 *
 *  One workspace can have multiple profiles. `isActive` flag picks the
 *  default for new articles.
 */
const sampleSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    text: { type: String, required: true, maxlength: 30_000 },
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    toneSummary: { type: String, default: "" },
    sentenceRhythm: { type: String, default: "" },
    vocabularyLevel: { type: String, default: "" },
    voiceTraits: { type: [String], default: [] },
    signaturePhrases: { type: [String], default: [] },
    avoidList: { type: [String], default: [] },
  },
  { _id: false }
);

const brandVoiceProfileSchema = new mongoose.Schema(
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
    description: { type: String, default: "", maxlength: 280 },
    samples: { type: [sampleSchema], default: [] },
    profile: { type: profileSchema, default: () => ({}) },
    isActive: { type: Boolean, default: false, index: true },
    extractedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

brandVoiceProfileSchema.index(
  { workspaceId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
// Primary list page query
brandVoiceProfileSchema.index({ workspaceId: 1, createdAt: -1 });

export const BrandVoiceProfile = mongoose.model(
  "BrandVoiceProfile",
  brandVoiceProfileSchema
);
export default BrandVoiceProfile;
