import { Wallet } from "#models/walletModel.js";

export const findWalletByUserId = async (userId) => {
  return Wallet.findOne({ userId }).exec();
};

export const createWallet = async (data) => {
  return Wallet.create(data);
};

export const updateWalletBalance = async (id, data) => {
  return Wallet.findByIdAndUpdate(id, data, { new: true }).exec();
};

export const debitWalletBalanceIfAvailable = async (id, amount) => {
  const safeAmount = Math.abs(Number(amount || 0));
  if (!safeAmount) return null;

  return Wallet.findOneAndUpdate(
    {
      _id: id,
      balance: { $gte: safeAmount },
    },
    {
      $inc: { balance: -safeAmount },
      lastTransactionAt: new Date(),
    },
    { new: true }
  ).exec();
};
