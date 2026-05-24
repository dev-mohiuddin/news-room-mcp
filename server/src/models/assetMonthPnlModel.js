import mongoose from "mongoose";

const assetMonthPnlSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    monthKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    grossProfit: { type: Number, default: 0, min: 0 },
    totalExpense: { type: Number, default: 0, min: 0 },
    carryInLoss: { type: Number, default: 0, min: 0 },
    distributableProfit: { type: Number, default: 0, min: 0 },
    carryOutLoss: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD" },
    recalculatedAt: { type: Date, default: Date.now },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

assetMonthPnlSchema.index({ assetId: 1, monthKey: 1 }, { unique: true });

export const AssetMonthPnl = mongoose.model("AssetMonthPnl", assetMonthPnlSchema);
