import mongoose from "mongoose";

const sharePaymentSchema = new mongoose.Schema(
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
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
    },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

sharePaymentSchema.index({ shareAccountId: 1, paidAt: 1 });

export const SharePayment = mongoose.model("SharePayment", sharePaymentSchema);
