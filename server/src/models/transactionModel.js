import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
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
    amount: { type: Number, required: true, immutable: true },
    currency: { type: String, default: "USD", immutable: true },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "profit", "adjustment", "reversal"],
      required: true,
      immutable: true,
    },
    referenceType: { type: String, immutable: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, immutable: true },
    occurredAt: { type: Date, default: Date.now, immutable: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      immutable: true,
    },
    metadata: { type: Object, default: {}, immutable: true },
  },
  { timestamps: true }
);

transactionSchema.index({ walletId: 1, occurredAt: 1 });
transactionSchema.index({ walletId: 1, type: 1, occurredAt: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
