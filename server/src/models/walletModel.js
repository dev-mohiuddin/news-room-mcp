import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
      unique: true,
    },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD" },
    lastTransactionAt: { type: Date },
  },
  { timestamps: true }
);

export const Wallet = mongoose.model("Wallet", walletSchema);
