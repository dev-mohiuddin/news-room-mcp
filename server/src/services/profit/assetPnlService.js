import {
  listAssetProfitMonthKeysByAsset,
  sumAssetProfitByAssetMonth,
} from "#repositories/assetProfitRepository.js";
import {
  listAssetExpenseMonthKeysByAsset,
  sumAssetExpensesByAssetMonth,
} from "#repositories/assetExpenseRepository.js";
import {
  findAssetMonthPnl,
  findPreviousAssetMonthPnl,
  listAssetMonthPnlMonthKeysByAsset,
  upsertAssetMonthPnl,
} from "#repositories/assetMonthPnlRepository.js";
import { throwError } from "#utils/throwErrorUtil.js";

const monthKeyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const roundCurrency = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const assertMonthKey = (monthKey) => {
  if (!monthKeyRegex.test(monthKey)) {
    throwError("Invalid month key format. Expected YYYY-MM", 400);
  }
};

const addMonths = (monthKey, delta) => {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
};

const nextMonthKey = (monthKey) => addMonths(monthKey, 1);

const maxMonthKey = (keys) => {
  if (!keys.length) return null;
  return [...keys].sort().at(-1) || null;
};

export const computeMonthlyPnlStatement = ({
  grossProfit,
  totalExpense,
  carryInLoss,
}) => {
  const safeGross = roundCurrency(Number(grossProfit) || 0);
  const safeExpense = roundCurrency(Math.max(Number(totalExpense) || 0, 0));
  const safeCarryIn = roundCurrency(Math.max(Number(carryInLoss) || 0, 0));

  const netAfterExpense = roundCurrency(safeGross - safeExpense);
  const availableForDistribution = roundCurrency(netAfterExpense - safeCarryIn);

  if (availableForDistribution > 0) {
    return {
      grossProfit: safeGross,
      totalExpense: safeExpense,
      carryInLoss: safeCarryIn,
      distributableProfit: availableForDistribution,
      carryOutLoss: 0,
      netAfterExpense,
    };
  }

  return {
    grossProfit: safeGross,
    totalExpense: safeExpense,
    carryInLoss: safeCarryIn,
    distributableProfit: 0,
    carryOutLoss: roundCurrency(Math.abs(availableForDistribution)),
    netAfterExpense,
  };
};

export const recomputeAssetPnlFromMonth = async (assetId, monthKey) => {
  assertMonthKey(monthKey);

  const [profitMonthKeys, expenseMonthKeys, snapshotMonthKeys] = await Promise.all([
    listAssetProfitMonthKeysByAsset(assetId, monthKey),
    listAssetExpenseMonthKeysByAsset(assetId, monthKey),
    listAssetMonthPnlMonthKeysByAsset(assetId, monthKey),
  ]);

  const allMonthKeys = Array.from(
    new Set([monthKey, ...profitMonthKeys, ...expenseMonthKeys, ...snapshotMonthKeys])
  );

  const endMonthKey = maxMonthKey(allMonthKeys) || monthKey;

  const previousStatement = await findPreviousAssetMonthPnl(assetId, monthKey);
  let carryInLoss = roundCurrency(previousStatement?.carryOutLoss || 0);

  let cursor = monthKey;
  while (cursor <= endMonthKey) {
    const [grossProfitRaw, totalExpenseRaw] = await Promise.all([
      sumAssetProfitByAssetMonth(assetId, cursor),
      sumAssetExpensesByAssetMonth(assetId, cursor),
    ]);

    const statement = computeMonthlyPnlStatement({
      grossProfit: grossProfitRaw,
      totalExpense: totalExpenseRaw,
      carryInLoss,
    });

    await upsertAssetMonthPnl(assetId, cursor, {
      grossProfit: statement.grossProfit,
      totalExpense: statement.totalExpense,
      carryInLoss: statement.carryInLoss,
      distributableProfit: statement.distributableProfit,
      carryOutLoss: statement.carryOutLoss,
      metadata: { netAfterExpense: statement.netAfterExpense },
    });

    carryInLoss = statement.carryOutLoss;
    cursor = nextMonthKey(cursor);
  }
};

export const getAssetMonthPnlStatement = async (
  assetId,
  monthKey,
  { recomputeIfMissing = true } = {}
) => {
  assertMonthKey(monthKey);

  let statement = await findAssetMonthPnl(assetId, monthKey);

  if (!statement && recomputeIfMissing) {
    await recomputeAssetPnlFromMonth(assetId, monthKey);
    statement = await findAssetMonthPnl(assetId, monthKey);
  }

  if (statement) return statement;

  const previousStatement = await findPreviousAssetMonthPnl(assetId, monthKey);

  return {
    assetId,
    monthKey,
    grossProfit: 0,
    totalExpense: 0,
    carryInLoss: roundCurrency(previousStatement?.carryOutLoss || 0),
    distributableProfit: 0,
    carryOutLoss: roundCurrency(previousStatement?.carryOutLoss || 0),
    metadata: { netAfterExpense: 0 },
    recalculatedAt: null,
  };
};
