import { DepositRequest } from "#models/depositRequestModel.js";

export const createDepositRequest = async (data) => {
  return DepositRequest.create(data);
};

export const getDepositRequestsByUser = async (userId) => {
  return DepositRequest.find({ userId }).sort({ createdAt: -1 }).exec();
};

export const getAllDepositRequests = async () => {
  return DepositRequest.find()
    .populate({
      path: "userId",
      select: "_id firstName lastName email",
      strictPopulate: false,
    })
    .sort({ createdAt: -1 })
    .exec();
};

export const getDepositRequestById = async (id) => {
  return DepositRequest.findById(id).exec();
};

export const updateDepositRequestById = async (id, data) => {
  return DepositRequest.findByIdAndUpdate(id, data, { new: true }).exec();
};
