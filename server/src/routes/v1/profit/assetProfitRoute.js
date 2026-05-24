import express from "express";
import { protect, authorize } from "#middlewares/authMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  getAssetMonthPnlController,
  recordAssetProfitController,
  recordAssetProfitAdjustmentController,
  listAssetProfitEntriesController,
} from "#controllers/profit/assetProfitController.js";
import {
  getAssetMonthPnlSchema,
  recordAssetProfitSchema,
  recordAssetProfitAdjustmentSchema,
  listAssetProfitEntriesSchema,
} from "#validations/profit/profitValidation.js";

export const assetProfitRouter = express.Router();

assetProfitRouter.post(
  "/asset-profits",
  protect,
  authorize("platform.asset:update"),
  validate(recordAssetProfitSchema),
  recordAssetProfitController
);

assetProfitRouter.post(
  "/asset-profits/adjustments",
  protect,
  authorize("platform.asset:update"),
  validate(recordAssetProfitAdjustmentSchema),
  recordAssetProfitAdjustmentController
);

assetProfitRouter.get(
  "/assets/:assetId/profit/:monthKey",
  protect,
  authorize("platform.asset:read"),
  validate(listAssetProfitEntriesSchema),
  listAssetProfitEntriesController
);

assetProfitRouter.get(
  "/assets/:assetId/pnl/:monthKey",
  protect,
  authorize("platform.asset:read"),
  validate(getAssetMonthPnlSchema),
  getAssetMonthPnlController
);
