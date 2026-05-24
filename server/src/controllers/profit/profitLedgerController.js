import { catchAsync } from "#utils/catchAsync.js";
import { createProfitAdjustment } from "#services/profit/profitLedgerService.js";

export const createProfitAdjustmentController = catchAsync(async (req, res) => {
  const ledger = await createProfitAdjustment(req.body, req.user);
  res.success({ data: ledger, message: "Profit ledger adjustment created", statusCode: 201 });
});

export const blockLedgerMutationController = catchAsync(async (req, res) => {
  res.error({ message: "Ledger records are immutable", statusCode: 405, data: null });
});
