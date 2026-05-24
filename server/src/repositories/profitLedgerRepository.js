import { ProfitLedger } from "#models/profitLedgerModel.js";

export const createProfitLedger = async (data) => {
  return ProfitLedger.create(data);
};

export const findProfitEntry = async (shareAccountId, ledgerDate, userId, type) => {
  return ProfitLedger.findOne({ shareAccountId, ledgerDate, userId, type }).exec();
};
