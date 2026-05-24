import { AssetProfit } from "#models/assetProfitModel.js";
import mongoose from "mongoose";

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);

export const createAssetProfit = async (data) => {
  return AssetProfit.create(data);
};

export const listAssetProfitsByMonth = async (monthKey) => {
  return AssetProfit.find({ monthKey }).exec();
};

export const listAssetProfitsByAssetMonth = async (assetId, monthKey) => {
  return AssetProfit.find({ assetId, monthKey }).exec();
};

export const listAssetProfitMonthKeysByAsset = async (assetId, fromMonthKey) => {
  const query = { assetId };
  if (fromMonthKey) {
    query.monthKey = { $gte: fromMonthKey };
  }

  const rows = await AssetProfit.aggregate([
    { $match: query },
    { $group: { _id: "$monthKey" } },
    { $sort: { _id: 1 } },
  ]).exec();

  return rows.map((row) => row._id);
};

export const sumAssetProfitByAssetMonth = async (assetId, monthKey) => {
  const rows = await AssetProfit.aggregate([
    {
      $match: {
        assetId,
        monthKey,
      },
    },
    {
      $project: {
        signedAmount: {
          $cond: [
            { $eq: ["$type", "reversal"] },
            { $multiply: ["$amount", -1] },
            "$amount",
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

export const sumAssetProfitByMonth = async (monthKey, assetId) => {
  const match = {};
  if (monthKey) match.monthKey = monthKey;
  if (assetId) match.assetId = toObjectId(assetId);

  const rows = await AssetProfit.aggregate([
    {
      $match: match,
    },
    {
      $project: {
        signedAmount: {
          $cond: [
            { $eq: ["$type", "reversal"] },
            { $multiply: ["$amount", -1] },
            "$amount",
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
