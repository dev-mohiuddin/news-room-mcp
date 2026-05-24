import { catchAsync } from "#utils/catchAsync.js";
import { getProfitSummary } from "#services/report/reportService.js";

export const getProfitSummaryController = catchAsync(async (req, res) => {
  const summary = await getProfitSummary({
    monthKey: req.query.monthKey,
    assetId: req.query.assetId,
  });
  res.success({ data: summary, message: "Profit summary retrieved" });
});
