import express from "express";
import { authRouter } from "#routes/v1/auth/authRoute.js";
import { userRouter } from "#routes/v1/user/userRoute.js";
import { assetRouter } from "#routes/v1/asset/assetRoute.js";
import { walletRouter } from "#routes/v1/wallet/walletRoute.js";
import { auditRouter } from "#routes/v1/audit/auditRoute.js";
import { shareRouter } from "#routes/v1/share/shareRoute.js";
import { assetExpenseRouter } from "#routes/v1/expense/assetExpenseRoute.js";
import { assetProfitRouter } from "#routes/v1/profit/assetProfitRoute.js";
import { profitLedgerRouter } from "#routes/v1/profit/profitLedgerRoute.js";
import { reportRouter } from "#routes/v1/report/reportRoute.js";

export const apiRouterV1 = express.Router();

apiRouterV1.use("/v1", [
  authRouter,
  userRouter,
  assetRouter,
  walletRouter,
  auditRouter,
  shareRouter,
  assetExpenseRouter,
  assetProfitRouter,
  profitLedgerRouter,
  reportRouter,
]);
