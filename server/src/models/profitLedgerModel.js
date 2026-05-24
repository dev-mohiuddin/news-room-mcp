import mongoose from "mongoose";

const profitLedgerSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      immutable: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
      immutable: true,
      index: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      immutable: true,
    },
    shareAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShareAccount",
      required: true,
      immutable: true,
    },
    ledgerDate: { type: String, required: true, immutable: true }, // YYYY-MM-DD
    amount: { type: Number, required: true, immutable: true },
    currency: { type: String, default: "USD", immutable: true },
    type: {
      type: String,
      enum: ["profit", "adjustment", "reversal"],
      default: "profit",
      immutable: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      immutable: true,
    },
    metadata: { type: Object, default: {}, immutable: true },
  },
  { timestamps: true }
);

profitLedgerSchema.index(
  { shareAccountId: 1, ledgerDate: 1, userId: 1, type: 1 },
  { unique: true }
);
profitLedgerSchema.index({ userId: 1, ledgerDate: -1 });
profitLedgerSchema.index({ userId: 1, assetId: 1, ledgerDate: -1 });

export const ProfitLedger = mongoose.model("ProfitLedger", profitLedgerSchema);
