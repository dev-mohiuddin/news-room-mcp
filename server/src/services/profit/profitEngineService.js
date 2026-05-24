import { listAssetProfitsByMonth } from "#repositories/assetProfitRepository.js";
import { listShareAccountsByAssetIds } from "#repositories/shareAccountRepository.js";
import { sumPaymentsUntil } from "#repositories/sharePaymentRepository.js";
import { findWalletByUserId, createWallet, updateWalletBalance } from "#repositories/walletRepository.js";
import { getAssetById } from "#repositories/assetRepository.js";
import { getAssetMonthPnlStatement } from "#services/profit/assetPnlService.js";
import { createProfitLedger, findProfitEntry } from "#repositories/profitLedgerRepository.js";
import { createTransaction } from "#repositories/transactionRepository.js";
import { getCompanyUser } from "#utils/companyUtil.js";
import { emitToUser } from "#socket/server.js";

const toMonthKey = (date) => date.toISOString().slice(0, 7);
const toDayKey = (date) => date.toISOString().slice(0, 10);
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

export const calculateDailyShareProfit = ({
  monthlyProfit,
  totalShares,
  daysInMonth,
  totalPaid,
  sharePrice,
}) => {
  if (!monthlyProfit || totalShares <= 0 || daysInMonth <= 0 || sharePrice <= 0) {
    return {
      dailyProfitPerShare: 0,
      userRatio: 0,
      companyRatio: 1,
      userProfit: 0,
      companyProfit: 0,
    };
  }

  const dailyProfitPerShare = monthlyProfit / totalShares / daysInMonth;
  const userRatio = Math.min(Math.max(totalPaid / sharePrice, 0), 1);
  const companyRatio = Math.max(1 - userRatio, 0);

  return {
    dailyProfitPerShare,
    userRatio,
    companyRatio,
    userProfit: dailyProfitPerShare * userRatio,
    companyProfit: dailyProfitPerShare * companyRatio,
  };
};

const getWallet = async (userId) => {
  let wallet = await findWalletByUserId(userId);
  if (!wallet) {
    wallet = await createWallet({ userId, balance: 0, currency: "USD" });
  }
  return wallet;
};

const creditWallet = async ({ wallet, userId, amount, referenceType, referenceId, createdBy, metadata }) => {
  if (amount <= 0) return null;
  const updated = await updateWalletBalance(wallet._id, { $inc: { balance: amount }, lastTransactionAt: new Date() });
  const transaction = await createTransaction({
    walletId: wallet._id,
    userId,
    amount,
    currency: wallet.currency,
    type: "profit",
    referenceType,
    referenceId,
    createdBy,
    metadata: metadata || {},
  });
  return { updated, transaction };
};

export const runDailyProfitDistribution = async (date = new Date()) => {
  const monthKey = toMonthKey(date);
  const ledgerDate = toDayKey(date);
  const dayEnd = endOfDay(date);

  const assetProfitEntries = await listAssetProfitsByMonth(monthKey);
  if (!assetProfitEntries.length) return { processed: 0 };

  const assetIds = [...new Set(assetProfitEntries.map((entry) => entry.assetId.toString()))];
  const shareAccounts = await listShareAccountsByAssetIds(assetIds);

  const companyUser = await getCompanyUser();
  if (!companyUser) return { processed: 0 };
  const companyWallet = await getWallet(companyUser._id);

  let processed = 0;

  for (const assetId of assetIds) {
    const asset = await getAssetById(assetId);
    if (!asset) continue;

    const monthStatement = await getAssetMonthPnlStatement(assetId, monthKey);
    const totalProfit = Number(monthStatement?.distributableProfit) || 0;

    if (!totalProfit || asset.totalShares <= 0) continue;

    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const { dailyProfitPerShare } = calculateDailyShareProfit({
      monthlyProfit: totalProfit,
      totalShares: asset.totalShares,
      daysInMonth,
      totalPaid: 0,
      sharePrice: asset.sharePrice,
    });

    const assetShares = shareAccounts.filter((share) => share.assetId.toString() === assetId);

    for (const share of assetShares) {
      const assignedUserId = share.assignedUserId;
      if (!assignedUserId) {
        const exists = await findProfitEntry(share._id, ledgerDate, companyUser._id, "profit");
        if (exists) continue;
        const ledger = await createProfitLedger({
          walletId: companyWallet._id,
          userId: companyUser._id,
          assetId: asset._id,
          shareAccountId: share._id,
          ledgerDate,
          amount: dailyProfitPerShare,
          currency: companyWallet.currency,
          type: "profit",
          createdBy: companyUser._id,
          metadata: { reason: "unsold-share" },
        });
        await creditWallet({
          wallet: companyWallet,
          userId: companyUser._id,
          amount: dailyProfitPerShare,
          referenceType: "ProfitLedger",
          referenceId: ledger._id,
          createdBy: companyUser._id,
          metadata: { assetId: asset._id, shareAccountId: share._id },
        });
        processed += 1;
        continue;
      }

      const paymentAggregate = await sumPaymentsUntil(share._id, assignedUserId, dayEnd);
      const totalPaid = paymentAggregate?.[0]?.total || 0;
      const { userRatio, companyRatio, userProfit, companyProfit } =
        calculateDailyShareProfit({
          monthlyProfit: totalProfit,
          totalShares: asset.totalShares,
          daysInMonth,
          totalPaid,
          sharePrice: asset.sharePrice,
        });

      if (userProfit > 0) {
        const exists = await findProfitEntry(share._id, ledgerDate, assignedUserId, "profit");
        if (!exists) {
          const wallet = await getWallet(assignedUserId);
          const ledger = await createProfitLedger({
            walletId: wallet._id,
            userId: assignedUserId,
            assetId: asset._id,
            shareAccountId: share._id,
            ledgerDate,
            amount: userProfit,
            currency: wallet.currency,
            type: "profit",
            createdBy: companyUser._id,
            metadata: { ownershipRatio: userRatio },
          });
          await creditWallet({
            wallet,
            userId: assignedUserId,
            amount: userProfit,
            referenceType: "ProfitLedger",
            referenceId: ledger._id,
            createdBy: companyUser._id,
            metadata: { assetId: asset._id, shareAccountId: share._id },
          });
          emitToUser(assignedUserId, "profit:credited", {
            amount: userProfit,
            assetId: asset._id,
            shareAccountId: share._id,
            ledgerDate,
          });
          processed += 1;
        }
      }

      if (companyProfit > 0) {
        const exists = await findProfitEntry(share._id, ledgerDate, companyUser._id, "profit");
        if (!exists) {
          const ledger = await createProfitLedger({
            walletId: companyWallet._id,
            userId: companyUser._id,
            assetId: asset._id,
            shareAccountId: share._id,
            ledgerDate,
            amount: companyProfit,
            currency: companyWallet.currency,
            type: "profit",
            createdBy: companyUser._id,
            metadata: { ownershipRatio: companyRatio },
          });
          await creditWallet({
            wallet: companyWallet,
            userId: companyUser._id,
            amount: companyProfit,
            referenceType: "ProfitLedger",
            referenceId: ledger._id,
            createdBy: companyUser._id,
            metadata: { assetId: asset._id, shareAccountId: share._id },
          });
          processed += 1;
        }
      }
    }
  }

  return { processed };
};
