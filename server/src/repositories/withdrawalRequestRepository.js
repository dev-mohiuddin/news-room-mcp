import { WithdrawalRequest } from "#models/withdrawalRequestModel.js";

export const createWithdrawalRequest = async (data) => {
  return WithdrawalRequest.create(data);
};

export const getWithdrawalRequestsByUser = async (userId) => {
  return WithdrawalRequest.find({ userId })
    .sort({ createdAt: -1 })
    .exec();
};

export const getAllWithdrawalRequests = async () => {
  return WithdrawalRequest.find()
    .populate({
      path: "userId",
      select: "_id firstName lastName email",
      strictPopulate: false,
    })
    .sort({ createdAt: -1 })
    .exec();
};

export const getWithdrawalRequestById = async (id) => {
  return WithdrawalRequest.findById(id).exec();
};

export const updateWithdrawalRequestById = async (id, data) => {
  return WithdrawalRequest.findByIdAndUpdate(id, data, { new: true }).exec();
};
