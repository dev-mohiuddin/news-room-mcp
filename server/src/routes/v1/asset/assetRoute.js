import express from "express";
import { protect, authorize } from "#middlewares/authMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createAssetController,
  listAssetsController,
  getAssetController,
  updateAssetController,
  deleteAssetController,
} from "#controllers/asset/assetController.js";
import {
  createAssetSchema,
  updateAssetSchema,
  getAssetSchema,
} from "#validations/asset/assetValidation.js";

export const assetRouter = express.Router();

assetRouter.post(
  "/assets",
  protect,
  authorize("platform.asset:create"),
  validate(createAssetSchema),
  createAssetController
);
assetRouter.get("/assets", protect, listAssetsController);
assetRouter.get(
  "/assets/:assetId",
  protect,
  validate(getAssetSchema),
  getAssetController
);
assetRouter.patch(
  "/assets/:assetId",
  protect,
  authorize("platform.asset:update"),
  validate(updateAssetSchema),
  updateAssetController
);
assetRouter.delete(
  "/assets/:assetId",
  protect,
  authorize("platform.asset:delete"),
  validate(getAssetSchema),
  deleteAssetController
);
