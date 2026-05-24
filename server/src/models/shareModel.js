import mongoose from "mongoose";

const shareSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
    },
    shareCount: { type: Number, required: true, min: 1 },
    paidAmount: { type: Number, required: true, min: 0 },
    totalSharePrice: { type: Number, required: true, min: 0 },
    ownershipPercentage: { type: Number, required: true, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Share = mongoose.model("Share", shareSchema);
