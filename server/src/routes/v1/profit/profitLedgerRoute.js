import express from "express";
import { protect, authorize } from "#middlewares/authMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import {
  createProfitAdjustmentController,
  blockLedgerMutationController,
} from "#controllers/profit/profitLedgerController.js";
import { createProfitAdjustmentSchema } from "#validations/profit/profitValidation.js";

export const profitLedgerRouter = express.Router();

profitLedgerRouter.post(
  "/profit-ledger/adjustments",
  protect,
  authorize("platform.audit:export"),
  validate(createProfitAdjustmentSchema),
  createProfitAdjustmentController
);

profitLedgerRouter.put(
  "/profit-ledger/:ledgerId",
  protect,
  authorize("platform.audit:export"),
  blockLedgerMutationController
);

profitLedgerRouter.patch(
  "/profit-ledger/:ledgerId",
  protect,
  authorize("platform.audit:export"),
  blockLedgerMutationController
);

profitLedgerRouter.delete(
  "/profit-ledger/:ledgerId",
  protect,
  authorize("platform.audit:export"),
  blockLedgerMutationController
);
