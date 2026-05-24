import express from "express";
import { protect, authorize } from "#middlewares/authMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import { getProfitSummaryController } from "#controllers/report/reportController.js";
import { profitSummaryQuerySchema } from "#validations/report/reportValidation.js";

export const reportRouter = express.Router();

reportRouter.get(
  "/reports/profit-summary",
  protect,
  authorize("platform.audit:read"),
  validate(profitSummaryQuerySchema),
  getProfitSummaryController
);
