import mongoose from "mongoose";

const shareAccountSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    shareNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["inactive", "active"],
      default: "inactive",
    },
    assignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },
    assignedAt: { type: Date, default: null },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },
  },
  { timestamps: true }
);

shareAccountSchema.index({ assetId: 1, shareNumber: 1 }, { unique: true });

export const ShareAccount = mongoose.model("ShareAccount", shareAccountSchema);
