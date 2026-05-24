import { SharePayment } from "#models/sharePaymentModel.js";

export const createSharePayment = async (data) => {
  return SharePayment.create(data);
};

export const listPaymentsByShare = async (shareAccountId) => {
  return SharePayment.find({ shareAccountId }).sort({ paidAt: 1 }).exec();
};

export const sumPaymentsUntil = async (shareAccountId, userId, date) => {
  return SharePayment.aggregate([
    {
      $match: {
        shareAccountId,
        userId,
        paidAt: { $lte: date },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]).exec();
};
