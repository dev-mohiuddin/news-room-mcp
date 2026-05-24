import mongoose from "mongoose";

const expenseLineItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 0.0001 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const assetExpenseSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      immutable: true,
      index: true,
    },
    monthKey: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
      index: true,
    },
    expenseDateTime: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
      index: true,
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      immutable: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      immutable: true,
    },
    lineItems: {
      type: [expenseLineItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "At least one line item is required",
      },
      immutable: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0.01,
      immutable: true,
    },
    currency: {
      type: String,
      default: "USD",
      immutable: true,
    },
    entryType: {
      type: String,
      enum: ["expense", "adjustment", "reversal"],
      default: "expense",
      immutable: true,
      index: true,
    },
    referenceExpenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssetExpense",
      immutable: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      required: true,
      immutable: true,
    },
    metadata: {
      type: Object,
      default: {},
      immutable: true,
    },
  },
  { timestamps: true }
);

assetExpenseSchema.index({ assetId: 1, monthKey: 1, expenseDateTime: -1 });

export const AssetExpense = mongoose.model("AssetExpense", assetExpenseSchema);
