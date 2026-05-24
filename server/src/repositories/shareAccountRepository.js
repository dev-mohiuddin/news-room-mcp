import { ShareAccount } from "#models/shareAccountModel.js";

export const createShareAccounts = async (docs) => {
  return ShareAccount.insertMany(docs, { ordered: true });
};

export const findShareAccountById = async (id) => {
  return ShareAccount.findById(id).exec();
};

export const listShareAccountsByAsset = async (assetId) => {
  return ShareAccount.find({ assetId })
    .populate({
      path: "assignedUserId",
      select: "_id firstName lastName email",
      strictPopulate: false,
    })
    .sort({ shareNumber: 1 })
    .exec();
};

export const assignShareAccount = async (id, data) => {
  return ShareAccount.findByIdAndUpdate(id, data, { new: true }).exec();
};

export const listActiveShareAccounts = async () => {
  return ShareAccount.find({ status: "active" }).exec();
};

export const listShareAccountsByAssetIds = async (assetIds) => {
  return ShareAccount.find({ assetId: { $in: assetIds } }).exec();
};

export const listShareAccountsByUser = async (userId) => {
  return ShareAccount.find({ assignedUserId: userId })
    .populate({
      path: "assetId",
      select: "_id name category sharePrice totalShares status",
      strictPopulate: false,
    })
    .sort({ createdAt: -1 })
    .exec();
};

export const findAvailableShareAccount = async (assetId) => {
  return ShareAccount.findOne({
    assetId,
    status: "inactive",
    assignedUserId: null,
  })
    .sort({ shareNumber: 1 })
    .exec();
};
