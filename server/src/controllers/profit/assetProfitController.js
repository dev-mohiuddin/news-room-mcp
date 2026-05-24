import { catchAsync } from "#utils/catchAsync.js";
import { recordAssetProfit, listAssetProfitEntries } from "#services/profit/assetProfitService.js";
import { getAssetMonthPnlStatement } from "#services/profit/assetPnlService.js";

export const recordAssetProfitController = catchAsync(async (req, res) => {
  const entry = await recordAssetProfit(req.body, req.user);
  res.success({ data: entry, message: "Asset profit recorded", statusCode: 201 });
});

export const recordAssetProfitAdjustmentController = catchAsync(async (req, res) => {
  const entry = await recordAssetProfit(req.body, req.user);
  res.success({ data: entry, message: "Asset profit adjustment recorded", statusCode: 201 });
});

export const listAssetProfitEntriesController = catchAsync(async (req, res) => {
  const entries = await listAssetProfitEntries(req.params.assetId, req.params.monthKey);
  res.success({ data: entries, message: "Asset profit entries retrieved" });
});

export const getAssetMonthPnlController = catchAsync(async (req, res) => {
  const statement = await getAssetMonthPnlStatement(req.params.assetId, req.params.monthKey);
  res.success({ data: statement, message: "Asset monthly PnL statement retrieved" });
});
