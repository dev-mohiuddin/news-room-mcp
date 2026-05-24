import mongoose from "mongoose";

const assetLedgerSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransactionCategory",
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    referenceDocUrl: {
      type: String, // E.g. receipt or invoice image
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
    }
  },
  { timestamps: true }
);

// Indexes to speed up reports per asset or date ranges
assetLedgerSchema.index({ assetId: 1, transactionDate: -1 });
assetLedgerSchema.index({ type: 1 });

export const AssetLedger = mongoose.model("AssetLedger", assetLedgerSchema);