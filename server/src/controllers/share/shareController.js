import { catchAsync } from "#utils/catchAsync.js";
import {
  assignShare,
  recordSharePayment,
  listShareAccounts,
  listSharePayments,
  listUserShareAccounts,
  purchaseShare,
} from "#services/share/shareService.js";

export const assignShareController = catchAsync(async (req, res) => {
  const result = await assignShare(req.params.shareAccountId, req.body, req.user);
  res.success({ data: result, message: "Share assigned" });
});

export const recordSharePaymentController = catchAsync(async (req, res) => {
  const payment = await recordSharePayment(req.params.shareAccountId, req.body, req.user);
  res.success({ data: payment, message: "Share payment recorded", statusCode: 201 });
});

export const listShareAccountsController = catchAsync(async (req, res) => {
  const accounts = await listShareAccounts(req.params.assetId);
  res.success({ data: accounts, message: "Share accounts retrieved" });
});

export const listSharePaymentsController = catchAsync(async (req, res) => {
  const payments = await listSharePayments(req.params.shareAccountId);
  res.success({ data: payments, message: "Share payments retrieved" });
});

export const listMyShareAccountsController = catchAsync(async (req, res) => {
  const accounts = await listUserShareAccounts(req.user.id || req.user._id);
  res.success({ data: accounts, message: "User share accounts retrieved" });
});

export const purchaseShareController = catchAsync(async (req, res) => {
  const result = await purchaseShare(req.params.assetId, req.body, req.user);
  res.success({ data: result, message: "Share(s) purchased successfully", statusCode: 201 });
});
