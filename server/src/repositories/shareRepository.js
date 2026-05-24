import { Share } from "#models/shareModel.js";

export const createShare = async (data) => {
  return Share.create(data);
};

export const getSharesByAsset = async (assetId) => {
  return Share.find({ assetId }).exec();
};

export const getSharesByInvestor = async (investorId) => {
  return Share.find({ investorId }).exec();
};
