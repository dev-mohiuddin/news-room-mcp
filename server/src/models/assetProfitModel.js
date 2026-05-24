import mongoose from "mongoose";

const assetProfitSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    monthKey: { type: String, required: true, trim: true }, // YYYY-MM
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    type: {
      type: String,
      enum: ["base", "adjustment", "reversal"],
      default: "base",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
    },
  },
  { timestamps: true }
);

assetProfitSchema.index({ assetId: 1, monthKey: 1 });

export const AssetProfit = mongoose.model("AssetProfit", assetProfitSchema);
