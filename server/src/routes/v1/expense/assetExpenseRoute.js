import express from "express";
import { protect, authorize } from "#middlewares/authMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  listAssetExpenseEntriesController,
  recordAssetExpenseController,
  recordAssetExpenseCorrectionController,
} from "#controllers/expense/assetExpenseController.js";
import {
  createAssetExpenseCorrectionSchema,
  createAssetExpenseSchema,
  listAssetExpensesSchema,
} from "#validations/expense/assetExpenseValidation.js";

export const assetExpenseRouter = express.Router();

assetExpenseRouter.post(
  "/asset-expenses",
  protect,
  authorize("platform.asset:update"),
  validate(createAssetExpenseSchema),
  recordAssetExpenseController
);

assetExpenseRouter.post(
  "/asset-expenses/corrections",
  protect,
  authorize("platform.asset:update"),
  validate(createAssetExpenseCorrectionSchema),
  recordAssetExpenseCorrectionController
);

assetExpenseRouter.get(
  "/asset-expenses",
  protect,
  authorize("platform.asset:read"),
  validate(listAssetExpensesSchema),
  listAssetExpenseEntriesController
);
