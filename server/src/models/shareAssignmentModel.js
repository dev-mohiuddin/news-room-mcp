import mongoose from "mongoose";

const shareAssignmentSchema = new mongoose.Schema(
  {
    shareAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShareAccount",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
    },
    assignedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },
  },
  { timestamps: true }
);

shareAssignmentSchema.index({ shareAccountId: 1, status: 1 });

export const ShareAssignment = mongoose.model(
  "ShareAssignment",
  shareAssignmentSchema
);
