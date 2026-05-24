import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["requested", "approved", "completed", "rejected", "cancelled"],
      required: true,
    },
    note: { type: String, trim: true },
    reason: { type: String, trim: true },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
    },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const depositProofSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, trim: true },
    screenshotUrl: { type: String, required: true, trim: true },
    screenshotPublicId: { type: String, required: true, trim: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const depositRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "USD" },
    method: {
      type: String,
      enum: ["bank", "bkash"],
      required: true,
    },
    proof: {
      type: depositProofSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["requested", "approved", "completed", "rejected", "cancelled"],
      default: "requested",
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

depositRequestSchema.index({ userId: 1, createdAt: -1 });
depositRequestSchema.index({ status: 1, createdAt: -1 });

export const DepositRequest = mongoose.model("DepositRequest", depositRequestSchema);
