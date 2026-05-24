import { Transaction } from "#models/transactionModel.js";

export const createTransaction = async (data) => {
  return Transaction.create(data);
};

export const listTransactionsByWallet = async (
  walletId,
  { type, startDate, endDate, limit = 50, skip = 0 } = {}
) => {
  const query = { walletId };

  if (type) {
    query.type = type;
  }

  if (startDate || endDate) {
    query.occurredAt = {};
    if (startDate) query.occurredAt.$gte = startDate;
    if (endDate) query.occurredAt.$lte = endDate;
  }

  return Transaction.find(query)
    .sort({ occurredAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};
