import { catchAsync } from "#utils/catchAsync.js";
import {
  createAsset,
  listAssets,
  getAsset,
  updateAsset,
  deleteAsset,
} from "#services/asset/assetService.js";

export const createAssetController = catchAsync(async (req, res) => {
  const asset = await createAsset(req.body, req.user);
  res.success({ data: asset, message: "Asset created", statusCode: 201 });
});

export const listAssetsController = catchAsync(async (req, res) => {
  const assets = await listAssets();
  res.success({ data: assets, message: "Assets retrieved" });
});

export const getAssetController = catchAsync(async (req, res) => {
  const asset = await getAsset(req.params.assetId);
  res.success({ data: asset, message: "Asset retrieved" });
});

export const updateAssetController = catchAsync(async (req, res) => {
  const asset = await updateAsset(req.params.assetId, req.body, req.user);
  res.success({ data: asset, message: "Asset updated" });
});

export const deleteAssetController = catchAsync(async (req, res) => {
  await deleteAsset(req.params.assetId, req.user);
  res.success({ data: null, message: "Asset deleted" });
});
