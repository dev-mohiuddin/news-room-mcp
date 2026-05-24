import { catchAsync } from "#utils/catchAsync.js";
import {
  getWallet,
  requestWithdrawal,
  listWithdrawals,
  listAllWithdrawals,
  updateWithdrawalStatus,
  cancelWithdrawalByInvestor,
  requestDeposit,
  listDeposits,
  listAllDeposits,
  updateDepositStatus,
} from "#services/wallet/walletService.js";

export const getWalletController = catchAsync(async (req, res) => {
  const wallet = await getWallet(req.user.id || req.user._id);
  res.success({ data: wallet, message: "Wallet retrieved" });
});

export const requestWithdrawalController = catchAsync(async (req, res) => {
  const request = await requestWithdrawal(req.user.id || req.user._id, req.body, req.user);
  res.success({ data: request, message: "Withdrawal requested", statusCode: 201 });
});

export const listWithdrawalsController = catchAsync(async (req, res) => {
  const requests = await listWithdrawals(req.user.id || req.user._id);
  res.success({ data: requests, message: "Withdrawals retrieved" });
});

export const listAllWithdrawalsController = catchAsync(async (req, res) => {
  const requests = await listAllWithdrawals();
  res.success({ data: requests, message: "All withdrawals retrieved" });
});

export const updateWithdrawalStatusController = catchAsync(async (req, res) => {
  const updated = await updateWithdrawalStatus(
    req.params.withdrawalId,
    req.body,
    req.user
  );
  res.success({ data: updated, message: "Withdrawal status updated" });
});

export const cancelMyWithdrawalController = catchAsync(async (req, res) => {
  const updated = await cancelWithdrawalByInvestor(
    req.user.id || req.user._id,
    req.params.withdrawalId,
    req.body,
    req.user
  );
  res.success({ data: updated, message: "Withdrawal cancelled" });
});

export const requestDepositController = catchAsync(async (req, res) => {
  const request = await requestDeposit(req.user.id || req.user._id, req.body, req.file, req.user);
  res.success({ data: request, message: "Deposit request submitted", statusCode: 201 });
});

export const listDepositsController = catchAsync(async (req, res) => {
  const requests = await listDeposits(req.user.id || req.user._id);
  res.success({ data: requests, message: "Deposits retrieved" });
});

export const listAllDepositsController = catchAsync(async (req, res) => {
  const requests = await listAllDeposits();
  res.success({ data: requests, message: "All deposits retrieved" });
});

export const updateDepositStatusController = catchAsync(async (req, res) => {
  const updated = await updateDepositStatus(req.params.depositId, req.body, req.user);
  res.success({ data: updated, message: "Deposit status updated" });
});
