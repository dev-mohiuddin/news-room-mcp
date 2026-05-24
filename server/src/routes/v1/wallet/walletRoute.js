import express from "express";
import { protect, authorize } from "#middlewares/authMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";
import { createStrictRateLimiter } from "#middlewares/rateLimiterMiddleware.js";
import { upload } from "#utils/multerUtil.js";
import {
  getWalletController,
  requestWithdrawalController,
  listWithdrawalsController,
  listAllWithdrawalsController,
  updateWithdrawalStatusController,
  cancelMyWithdrawalController,
  requestDepositController,
  listDepositsController,
  listAllDepositsController,
  updateDepositStatusController,
} from "#controllers/wallet/walletController.js";
import {
  requestWithdrawalSchema,
  updateWithdrawalStatusSchema,
  cancelMyWithdrawalSchema,
  requestDepositSchema,
  updateDepositStatusSchema,
} from "#validations/wallet/walletValidation.js";

export const walletRouter = express.Router();

walletRouter.get("/wallet", protect, getWalletController);
walletRouter.get("/wallet/withdrawals", protect, listWithdrawalsController);
walletRouter.get("/wallet/deposits", protect, listDepositsController);
walletRouter.get(
  "/wallet/withdrawals/admin",
  protect,
  authorize("platform.wallet:manage"),
  listAllWithdrawalsController
);
walletRouter.get(
  "/wallet/deposits/admin",
  protect,
  authorize("platform.wallet:manage"),
  listAllDepositsController
);
walletRouter.post(
  "/wallet/withdrawals",
  protect,
  createStrictRateLimiter(3, 15),
  validate(requestWithdrawalSchema),
  requestWithdrawalController
);
walletRouter.post(
  "/wallet/deposits",
  protect,
  createStrictRateLimiter(5, 15),
  upload.single("screenshot"),
  validate(requestDepositSchema),
  requestDepositController
);

walletRouter.patch(
  "/wallet/withdrawals/:withdrawalId/cancel",
  protect,
  validate(cancelMyWithdrawalSchema),
  cancelMyWithdrawalController
);

walletRouter.patch(
  "/wallet/withdrawals/:withdrawalId/status",
  protect,
  authorize("platform.wallet:manage"),
  validate(updateWithdrawalStatusSchema),
  updateWithdrawalStatusController
);

walletRouter.patch(
  "/wallet/deposits/:depositId/status",
  protect,
  authorize("platform.wallet:manage"),
  validate(updateDepositStatusSchema),
  updateDepositStatusController
);
