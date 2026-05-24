import { sumAssetProfitByMonth } from "#repositories/assetProfitRepository.js";
import { sumAssetExpensesByMonth } from "#repositories/assetExpenseRepository.js";
import { sumAssetMonthPnlByMonth } from "#repositories/assetMonthPnlRepository.js";
import { getAssetById } from "#repositories/assetRepository.js";
import { listShareAccountsByAsset } from "#repositories/shareAccountRepository.js";
import { sumPaymentsUntil } from "#repositories/sharePaymentRepository.js";
import { ProfitLedger } from "#models/profitLedgerModel.js";
import { getCompanyUser } from "#utils/companyUtil.js";
import mongoose from "mongoose";

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);

const buildLedgerFilter = ({ monthKey, assetId }) => {
  const filter = {};
  if (monthKey) {
    filter.ledgerDate = new RegExp(`^${monthKey}`);
  }
  if (assetId) {
    filter.assetId = toObjectId(assetId);
  }
  return filter;
};

const roundCurrency = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const calculateCurrentEntitlementSplit = async ({ assetId, netProfit }) => {
  if (!assetId) {
    return {
      currentInvestorEntitlement: null,
      currentCompanyEntitlement: null,
      currentInvestorRatio: null,
      currentCompanyRatio: null,
    };
  }

  const asset = await getAssetById(assetId);
  if (!asset || !asset.totalShares || !asset.sharePrice) {
    return {
      currentInvestorEntitlement: 0,
      currentCompanyEntitlement: Math.max(roundCurrency(netProfit), 0),
      currentInvestorRatio: 0,
      currentCompanyRatio: 1,
    };
  }

  const shareAccounts = await listShareAccountsByAsset(asset._id);
  if (!shareAccounts.length) {
    return {
      currentInvestorEntitlement: 0,
      currentCompanyEntitlement: Math.max(roundCurrency(netProfit), 0),
      currentInvestorRatio: 0,
      currentCompanyRatio: 1,
    };
  }

  const now = new Date();
  const ratioRows = await Promise.all(
    shareAccounts.map(async (share) => {
      const assignedUserId =
        typeof share.assignedUserId === "string"
          ? share.assignedUserId
          : share.assignedUserId?._id || null;

      if (!assignedUserId) {
        return { userRatio: 0, companyRatio: 1 };
      }

      const paymentAgg = await sumPaymentsUntil(share._id, assignedUserId, now);
      const totalPaid = paymentAgg?.[0]?.total || 0;
      const userRatio = Math.min(Math.max(totalPaid / asset.sharePrice, 0), 1);

      return {
        userRatio,
        companyRatio: Math.max(1 - userRatio, 0),
      };
    })
  );

  const userRatioTotal = ratioRows.reduce((sum, row) => sum + row.userRatio, 0);
  const companyRatioTotal = ratioRows.reduce((sum, row) => sum + row.companyRatio, 0);
  const divisor = asset.totalShares > 0 ? asset.totalShares : ratioRows.length;

  const currentInvestorRatio = divisor > 0 ? userRatioTotal / divisor : 0;
  const currentCompanyRatio = divisor > 0 ? companyRatioTotal / divisor : 1;
  const positiveNet = Math.max(roundCurrency(netProfit), 0);

  return {
    currentInvestorEntitlement: roundCurrency(positiveNet * currentInvestorRatio),
    currentCompanyEntitlement: roundCurrency(positiveNet * currentCompanyRatio),
    currentInvestorRatio,
    currentCompanyRatio,
  };
};

export const getProfitSummary = async ({ monthKey, assetId } = {}) => {
  const scopedLedgerFilter = buildLedgerFilter({ monthKey, assetId });

  const [totalInput, totalExpense, pnlSummary, distributedAgg, companyUser] = await Promise.all([
    sumAssetProfitByMonth(monthKey, assetId),
    sumAssetExpensesByMonth(monthKey, assetId),
    sumAssetMonthPnlByMonth(monthKey, assetId),
    ProfitLedger.aggregate([
      { $match: scopedLedgerFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    getCompanyUser(),
  ]);

  let companyProfit = 0;
  let userProfit = 0;
  if (companyUser) {
    const [companyAgg, userAgg] = await Promise.all([
      ProfitLedger.aggregate([
        { $match: { ...scopedLedgerFilter, userId: companyUser._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      ProfitLedger.aggregate([
        { $match: { ...scopedLedgerFilter, userId: { $ne: companyUser._id } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    companyProfit = companyAgg?.[0]?.total || 0;
    userProfit = userAgg?.[0]?.total || 0;
  } else {
    userProfit = distributedAgg?.[0]?.total || 0;
  }

  const totalDistributed = distributedAgg?.[0]?.total || 0;
  const netProfit = totalInput - totalExpense;
  const totalCarryInLoss = pnlSummary?.totalCarryInLoss || 0;
  const totalDistributableProfit = pnlSummary?.totalDistributableProfit || 0;
  const totalCarryOutLoss = pnlSummary?.totalCarryOutLoss || 0;
  const currentSplit = await calculateCurrentEntitlementSplit({ assetId, netProfit });

  return {
    monthKey: monthKey || null,
    totalInput,
    totalExpense,
    netProfit,
    totalCarryInLoss,
    totalDistributableProfit,
    totalCarryOutLoss,
    totalDistributed,
    companyProfit,
    userProfit,
    currentInvestorEntitlement: currentSplit.currentInvestorEntitlement,
    currentCompanyEntitlement: currentSplit.currentCompanyEntitlement,
    currentInvestorRatio: currentSplit.currentInvestorRatio,
    currentCompanyRatio: currentSplit.currentCompanyRatio,
  };
};
