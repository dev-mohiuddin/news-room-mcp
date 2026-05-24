import { catchAsync } from "#utils/catchAsync.js";
import {
  listAssetExpenseEntries,
  recordAssetExpense,
  recordAssetExpenseCorrection,
} from "#services/expense/assetExpenseService.js";

export const recordAssetExpenseController = catchAsync(async (req, res) => {
  const entry = await recordAssetExpense(req.body, req.user);
  res.success({ data: entry, message: "Asset expense recorded", statusCode: 201 });
});

export const recordAssetExpenseCorrectionController = catchAsync(async (req, res) => {
  const entry = await recordAssetExpenseCorrection(req.body, req.user);
  res.success({ data: entry, message: "Asset expense correction recorded", statusCode: 201 });
});

export const listAssetExpenseEntriesController = catchAsync(async (req, res) => {
  const entries = await listAssetExpenseEntries(req.query);
  res.success({ data: entries, message: "Asset expense entries retrieved" });
});
