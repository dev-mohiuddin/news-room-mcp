import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["requested", "approved", "processing", "paid", "rejected", "cancelled"],
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

const payoutSnapshotSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["bank", "bkash"],
      required: true,
    },
    preferredMethod: {
      type: String,
      enum: ["bank", "bkash"],
    },
    bankAccount: {
      bankName: { type: String, trim: true },
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      routingNumber: { type: String, trim: true },
      branchName: { type: String, trim: true },
    },
    bkash: {
      number: { type: String, trim: true },
      accountType: {
        type: String,
        enum: ["personal", "agent"],
      },
      accountHolderName: { type: String, trim: true },
    },
  },
  { _id: false }
);

const withdrawalRequestSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["requested", "approved", "processing", "paid", "rejected", "cancelled"],
      default: "requested",
    },
    method: {
      type: String,
      enum: ["bank", "bkash"],
      required: true,
    },
    payoutSnapshot: {
      type: payoutSnapshotSchema,
      required: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

withdrawalRequestSchema.index({ userId: 1, createdAt: -1 });
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });

export const WithdrawalRequest = mongoose.model(
  "WithdrawalRequest",
  withdrawalRequestSchema
);
