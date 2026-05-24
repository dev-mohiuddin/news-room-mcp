import mongoose from "mongoose";

const transactionCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { 
      type: String, 
      enum: ["income", "expense"], 
      required: true 
    },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
    }
  },
  { timestamps: true }
);

export const TransactionCategory = mongoose.model("TransactionCategory", transactionCategorySchema);