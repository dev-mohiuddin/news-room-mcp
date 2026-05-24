import mongoose from "mongoose";
import { AssetExpense } from "#models/assetExpenseModel.js";

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);

export const createAssetExpense = async (data) => {
  return AssetExpense.create(data);
};

export const findAssetExpenseById = async (id) => {
  return AssetExpense.findById(id).exec();
};

export const listAssetExpenses = async ({
  assetId,
  monthKey,
  entryType,
  startDate,
  endDate,
} = {}) => {
  const query = {};

  if (assetId) query.assetId = toObjectId(assetId);
  if (monthKey) query.monthKey = monthKey;
  if (entryType) query.entryType = entryType;

  if (startDate || endDate) {
    query.expenseDateTime = {};
    if (startDate) query.expenseDateTime.$gte = startDate;
    if (endDate) query.expenseDateTime.$lte = endDate;
  }

  return AssetExpense.find(query).sort({ expenseDateTime: -1, createdAt: -1 }).exec();
};

export const listAssetExpenseMonthKeysByAsset = async (assetId, fromMonthKey) => {
  const match = { assetId: toObjectId(assetId) };
  if (fromMonthKey) {
    match.monthKey = { $gte: fromMonthKey };
  }

  const rows = await AssetExpense.aggregate([
    { $match: match },
    { $group: { _id: "$monthKey" } },
    { $sort: { _id: 1 } },
  ]).exec();

  return rows.map((row) => row._id);
};

export const sumAssetExpensesByAssetMonth = async (assetId, monthKey) => {
  const rows = await AssetExpense.aggregate([
    {
      $match: {
        assetId: toObjectId(assetId),
        monthKey,
      },
    },
    {
      $project: {
        signedAmount: {
          $cond: [
            { $eq: ["$entryType", "reversal"] },
            { $multiply: ["$totalAmount", -1] },
            "$totalAmount",
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$signedAmount" },
      },
    },
  ]).exec();

  return rows?.[0]?.total || 0;
};

export const sumAssetExpensesByMonth = async (monthKey, assetId) => {
  const match = {};
  if (monthKey) match.monthKey = monthKey;
  if (assetId) match.assetId = toObjectId(assetId);

  const rows = await AssetExpense.aggregate([
    {
      $match: match,
    },
    {
      $project: {
        signedAmount: {
          $cond: [
            { $eq: ["$entryType", "reversal"] },
            { $multiply: ["$totalAmount", -1] },
            "$totalAmount",
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$signedAmount" },
      },
    },
  ]).exec();

  return rows?.[0]?.total || 0;
};
