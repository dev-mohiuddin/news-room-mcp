import {
  getAllUsers,
  createUser,
  findUserByEmail,
  updateUser as updateUserRepo,
  findUserById,
} from "#repositories/userRepository.js";
import { findDefaultRole, findRoleByName } from "#repositories/roleRepository.js";
import {
  createWallet,
  findWalletByUserId,
} from "#repositories/walletRepository.js";
import { listShareAccountsByUser } from "#repositories/shareAccountRepository.js";
import { sumPaymentsUntil } from "#repositories/sharePaymentRepository.js";
import { listTransactionsByWallet } from "#repositories/transactionRepository.js";
import { PlatformUser } from "#models/userModel.js";
import { ProfitLedger } from "#models/profitLedgerModel.js";
import { AssetMonthPnl } from "#models/assetMonthPnlModel.js";
import { cloudinary } from "#utils/cloudinaryUtil.js";
import { logAudit } from "#utils/auditLogger.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { sendEmail } from "#utils/emailUtil.js";

const IDENTITY_DOC_TYPES = new Set(["NID", "Driving License", "Passport"]);

const roundCurrency = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const uploadBufferToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });

    stream.end(buffer);
  });
};

const normalizeCloudinaryUploadError = (error) => {
  const message = error?.message || "Cloudinary upload failed";

  if (/cloud_name is disabled/i.test(message)) {
    return "Cloudinary cloud name is disabled or invalid. Update CLOUDINARY_CLOUD_NAME with an active lowercase cloud name from Cloudinary dashboard.";
  }

  if (/must supply api_key|invalid api_key|api key/i.test(message)) {
    return "Cloudinary API key is invalid. Check CLOUDINARY_API_KEY in server/.env.";
  }

  if (/invalid signature|api secret/i.test(message)) {
    return "Cloudinary API secret is invalid. Check CLOUDINARY_API_SECRET in server/.env.";
  }

  return `Cloudinary upload failed: ${message}`;
};

const getApprovalStatus = (user) => user?.investorProfile?.approval?.status || null;

const resolveInvestorStatusLabel = (user) => {
  const approval = getApprovalStatus(user);
  if (approval === "on-hold") return "on-hold";
  if (!user?.isActive) return "inactive";
  if (approval === "approved") return "active";
  if (approval === "rejected") return "rejected";
  if (approval === "submitted") return "pending-approval";
  if (!user?.isVerified) return "pending-verification";
  return "draft";
};

const buildUserResponse = (user) => ({
  _id: user._id,
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
  email: user.email,
  phone: user.phone || "",
  country: user.country || "",
  role: user.roleId?._id || user.roleId,
  roleName: user.roleId?.name,
  permissions: user.roleId?.permissions || [],
  isVerified: user.isVerified,
  isActive: user.isActive,
  approvalStatus: getApprovalStatus(user),
  investorStatus: resolveInvestorStatusLabel(user),
  kycStatus: user?.investorProfile?.kycStatus || "pending",
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const resolveInvestorRole = async () => {
  return (
    (await findRoleByName("Investor")) ||
    (await findDefaultRole()) ||
    (await findRoleByName("User"))
  );
};

export const listUsers = async (filters = {}) => {
  const { page = 1, limit = 50, roleName, isActive } = filters;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const pageSize = Math.min(parseInt(limit), 100);

  const query = {};
  if (roleName) query.roleName = { $regex: roleName, $options: "i" };
  if (isActive !== undefined) query.isActive = isActive === "true" || isActive === true;

  return getAllUsers(query, skip, pageSize);
};

export const getUserById = async (id) => {
  const user = await findUserById(id, { populateRole: true });
  if (!user) throwError("User not found", 404);
  return user;
};

const ME_UPDATE_WHITELIST = [
  "firstName",
  "lastName",
  "phone",
  "country",
  "profilePhoto",
  "investorProfile.payoutDetails",
  "investorProfile.accreditationStatus",
  "investorProfile.riskProfile",
  "investorProfile.onboardingCompleted",
];

const pickWhitelisted = (data, whitelist) => {
  const result = {};
  for (const key of whitelist) {
    const parts = key.split(".");
    let sourceVal = data;
    let target = result;
    let found = true;
    for (let i = 0; i < parts.length - 1; i++) {
      if (sourceVal?.[parts[i]] === undefined) { found = false; break; }
      sourceVal = sourceVal[parts[i]];
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    if (!found) continue;
    const lastKey = parts[parts.length - 1];
    if (sourceVal?.[lastKey] !== undefined) {
      target[lastKey] = sourceVal[lastKey];
    }
  }
  return result;
};

export const updateUser = async (id, data) => {
  const safeData = pickWhitelisted(data, ME_UPDATE_WHITELIST);
  if (Object.keys(safeData).length === 0) throwError("No valid fields to update", 400);
  const user = await updateUserRepo(id, safeData);
  if (!user) throwError("User not found", 404);
  return user;
};

const getInvestorAnalytics = async (userId) => {
  const [wallet, shareAccounts] = await Promise.all([
    findWalletByUserId(userId),
    listShareAccountsByUser(userId),
  ]);

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthPrefix = todayKey.slice(0, 7);

  const [todayRows, monthRows, lifetimeRows] = await Promise.all([
    ProfitLedger.aggregate([
      { $match: { userId, ledgerDate: todayKey } },
      { $group: { _id: "$assetId", amount: { $sum: "$amount" } } },
    ]),
    ProfitLedger.aggregate([
      { $match: { userId, ledgerDate: new RegExp(`^${monthPrefix}`) } },
      { $group: { _id: "$assetId", amount: { $sum: "$amount" } } },
    ]),
    ProfitLedger.aggregate([
      { $match: { userId } },
      { $group: { _id: "$assetId", amount: { $sum: "$amount" } } },
    ]),
  ]);

  const todayByAsset = new Map(todayRows.map((row) => [row._id?.toString(), roundCurrency(row.amount)]));
  const monthByAsset = new Map(monthRows.map((row) => [row._id?.toString(), roundCurrency(row.amount)]));
  const lifetimeByAsset = new Map(
    lifetimeRows.map((row) => [row._id?.toString(), roundCurrency(row.amount)])
  );

  const accountSummaries = await Promise.all(
    shareAccounts.map(async (share) => {
      const assignedUserId = share.assignedUserId?._id || share.assignedUserId;
      const payments = await sumPaymentsUntil(share._id, assignedUserId, now);
      const paidAmount = roundCurrency(payments?.[0]?.total || 0);
      return {
        share,
        paidAmount,
      };
    })
  );

  const assetMap = new Map();
  accountSummaries.forEach(({ share, paidAmount }) => {
    const asset = share.assetId;
    const assetId = asset?._id?.toString();
    if (!assetId) return;

    const sharePrice = Number(asset.sharePrice || 0);
    if (!assetMap.has(assetId)) {
      assetMap.set(assetId, {
        assetId,
        assetName: asset.name || "Asset",
        category: asset.category || "-",
        shareCount: 0,
        totalPaid: 0,
        totalShareValue: 0,
        ownershipPercentage: 0,
        dailyEarning: roundCurrency(todayByAsset.get(assetId) || 0),
        monthlyEarning: roundCurrency(monthByAsset.get(assetId) || 0),
        lifetimeEarning: roundCurrency(lifetimeByAsset.get(assetId) || 0),
      });
    }

    const row = assetMap.get(assetId);
    row.shareCount += 1;
    row.totalPaid = roundCurrency(row.totalPaid + paidAmount);
    row.totalShareValue = roundCurrency(row.totalShareValue + sharePrice);
    row.ownershipPercentage =
      row.totalShareValue > 0
        ? roundCurrency((row.totalPaid / row.totalShareValue) * 100)
        : 0;
  });

  const assets = Array.from(assetMap.values()).sort((a, b) => b.totalPaid - a.totalPaid);

  return {
    wallet: {
      balance: roundCurrency(wallet?.balance || 0),
      currency: wallet?.currency || "USD",
      lastTransactionAt: wallet?.lastTransactionAt || null,
    },
    totals: {
      investedCapital: roundCurrency(assets.reduce((sum, row) => sum + row.totalPaid, 0)),
      dailyEarning: roundCurrency(assets.reduce((sum, row) => sum + row.dailyEarning, 0)),
      monthlyEarning: roundCurrency(assets.reduce((sum, row) => sum + row.monthlyEarning, 0)),
      lifetimeEarning: roundCurrency(assets.reduce((sum, row) => sum + row.lifetimeEarning, 0)),
      assetCount: assets.length,
      shareCount: assets.reduce((sum, row) => sum + row.shareCount, 0),
    },
    assets,
  };
};

const getRecentMonthKeys = (count = 6) => {
  const now = new Date();
  const keys = [];

  for (let idx = count - 1; idx >= 0; idx -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - idx, 1));
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    keys.push(`${year}-${month}`);
  }

  return keys;
};

export const getInvestorDashboardByUserId = async (userId) => {
  const user = await findUserById(userId, { populateRole: true });
  if (!user) throwError("User not found", 404);

  const analytics = await getInvestorAnalytics(user._id);
  const assetIds = analytics.assets.map((asset) => asset.assetId).filter(Boolean);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const recentMonthKeys = getRecentMonthKeys(6);

  const [monthPnlRows, trendRows] = await Promise.all([
    assetIds.length
      ? AssetMonthPnl.find({
          assetId: { $in: assetIds },
          monthKey: currentMonthKey,
        })
          .select("grossProfit totalExpense distributableProfit")
          .lean()
      : Promise.resolve([]),
    ProfitLedger.aggregate([
      {
        $match: {
          userId: user._id,
          ledgerDate: { $gte: `${recentMonthKeys[0]}-01` },
        },
      },
      {
        $project: {
          monthKey: { $substrBytes: ["$ledgerDate", 0, 7] },
          amount: 1,
        },
      },
      {
        $group: {
          _id: "$monthKey",
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const grossAssetTotal = roundCurrency(
    monthPnlRows.reduce((sum, row) => sum + Number(row.grossProfit || 0), 0)
  );
  const expenseAssetTotal = roundCurrency(
    monthPnlRows.reduce((sum, row) => sum + Number(row.totalExpense || 0), 0)
  );
  const netAssetTotal = roundCurrency(
    monthPnlRows.reduce((sum, row) => sum + Number(row.distributableProfit || 0), 0)
  );

  const trendMap = new Map(trendRows.map((row) => [row._id, roundCurrency(row.amount)]));
  const monthlyTrend = recentMonthKeys.map((monthKey) => ({
    monthKey,
    amount: trendMap.get(monthKey) || 0,
  }));

  return {
    user: buildUserResponse(user),
    wallet: analytics.wallet,
    portfolio: {
      assetCount: analytics.totals.assetCount,
      shareCount: analytics.totals.shareCount,
      investedCapital: analytics.totals.investedCapital,
    },
    cards: {
      grossAssetTotal,
      expenseAssetTotal,
      netAssetTotal,
      investorMonthlyShare: analytics.totals.monthlyEarning,
      investorLifetimeShare: analytics.totals.lifetimeEarning,
    },
    assetBreakdown: analytics.assets,
    monthlyTrend,
  };
};

export const listMyTransactions = async (userId, query = {}) => {
  const wallet = await findWalletByUserId(userId);
  if (!wallet) {
    return {
      balance: 0,
      currency: "USD",
      transactions: [],
    };
  }

  const limit = Math.max(1, Math.min(Number(query.limit) || 50, 200));
  const skip = Math.max(0, Number(query.skip) || 0);

  const startDate = query.startDate ? new Date(query.startDate) : undefined;
  const endDate = query.endDate ? new Date(query.endDate) : undefined;

  const transactions = await listTransactionsByWallet(wallet._id, {
    type: query.type,
    startDate: Number.isNaN(startDate?.getTime()) ? undefined : startDate,
    endDate: Number.isNaN(endDate?.getTime()) ? undefined : endDate,
    limit,
    skip,
  });

  return {
    balance: roundCurrency(wallet.balance || 0),
    currency: wallet.currency || "USD",
    transactions,
  };
};

export const getInvestorByIdForAdmin = async (investorId) => {
  const user = await findUserById(investorId, { populateRole: true });
  if (!user) throwError("Investor not found", 404);

  const analytics = await getInvestorAnalytics(user._id);
  return {
    ...buildUserResponse(user),
    investorProfile: user.investorProfile || {},
    payoutDetails: user.investorProfile?.payoutDetails || {},
    documents: {
      identityDocuments: user.identityDocuments || [],
      otherDocuments: user.otherDocuments || [],
    },
    analytics,
  };
};

export const updateInvestorByAdmin = async (investorId, payload, actor) => {
  const existing = await findUserById(investorId, { populateRole: true });
  if (!existing) throwError("Investor not found", 404);

  const updateDoc = {};

  if (typeof payload.firstName === "string") {
    updateDoc.firstName = payload.firstName.trim();
  }
  if (typeof payload.lastName === "string") {
    updateDoc.lastName = payload.lastName.trim();
  }
  if (typeof payload.phone === "string") {
    updateDoc.phone = payload.phone.trim() || undefined;
  }
  if (typeof payload.country === "string") {
    updateDoc.country = payload.country.trim() || undefined;
  }
  if (typeof payload.isActive === "boolean") {
    updateDoc.isActive = payload.isActive;
  }

  const investorProfile = payload.investorProfile || {};
  if (typeof investorProfile.kycStatus === "string") {
    updateDoc["investorProfile.kycStatus"] = investorProfile.kycStatus;
  }
  if (typeof investorProfile.accreditationStatus === "string") {
    updateDoc["investorProfile.accreditationStatus"] =
      investorProfile.accreditationStatus;
  }
  if (typeof investorProfile.riskProfile === "string") {
    updateDoc["investorProfile.riskProfile"] = investorProfile.riskProfile;
  }
  if (typeof investorProfile.onboardingCompleted === "boolean") {
    updateDoc["investorProfile.onboardingCompleted"] =
      investorProfile.onboardingCompleted;
  }

  const approval = investorProfile.approval || {};
  if (typeof approval.status === "string") {
    updateDoc["investorProfile.approval.status"] = approval.status;
  }
  if (typeof approval.approvalNote === "string") {
    updateDoc["investorProfile.approval.approvalNote"] = approval.approvalNote.trim();
  }
  if (typeof approval.rejectionReason === "string") {
    updateDoc["investorProfile.approval.rejectionReason"] =
      approval.rejectionReason.trim();
  }
  if (typeof approval.holdReason === "string") {
    updateDoc["investorProfile.approval.holdReason"] = approval.holdReason.trim();
  }

  const payoutDetails = investorProfile.payoutDetails || {};
  if (typeof payoutDetails.preferredMethod === "string") {
    updateDoc["investorProfile.payoutDetails.preferredMethod"] =
      payoutDetails.preferredMethod;
  }

  const bankAccount = payoutDetails.bankAccount || {};
  if (typeof bankAccount.bankName === "string") {
    updateDoc["investorProfile.payoutDetails.bankAccount.bankName"] =
      bankAccount.bankName.trim();
  }
  if (typeof bankAccount.accountHolderName === "string") {
    updateDoc["investorProfile.payoutDetails.bankAccount.accountHolderName"] =
      bankAccount.accountHolderName.trim();
  }
  if (typeof bankAccount.accountNumber === "string") {
    updateDoc["investorProfile.payoutDetails.bankAccount.accountNumber"] =
      bankAccount.accountNumber.trim();
  }
  if (typeof bankAccount.routingNumber === "string") {
    updateDoc["investorProfile.payoutDetails.bankAccount.routingNumber"] =
      bankAccount.routingNumber.trim();
  }
  if (typeof bankAccount.branchName === "string") {
    updateDoc["investorProfile.payoutDetails.bankAccount.branchName"] =
      bankAccount.branchName.trim();
  }

  const bkash = payoutDetails.bkash || {};
  if (typeof bkash.number === "string") {
    updateDoc["investorProfile.payoutDetails.bkash.number"] = bkash.number.trim();
  }
  if (typeof bkash.accountType === "string") {
    updateDoc["investorProfile.payoutDetails.bkash.accountType"] = bkash.accountType;
  }
  if (typeof bkash.accountHolderName === "string") {
    updateDoc["investorProfile.payoutDetails.bkash.accountHolderName"] =
      bkash.accountHolderName.trim();
  }

  if (Object.keys(updateDoc).length === 0) {
    throwError("No valid fields to update", 400);
  }

  await PlatformUser.findByIdAndUpdate(investorId, { $set: updateDoc }, { new: true }).exec();
  const updated = await findUserById(investorId, { populateRole: true });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "user.investor.update",
    entity: "PlatformUser",
    entityId: investorId,
    before: existing.toObject(),
    after: updated?.toObject(),
  });

  return buildUserResponse(updated);
};

export const updateInvestorStatusByAdmin = async (investorId, payload, actor) => {
  const user = await findUserById(investorId, { populateRole: true });
  if (!user) throwError("Investor not found", 404);

  const reason = payload.reason?.trim() || undefined;
  const updateDoc = {};

  if (payload.action === "activate") {
    updateDoc.isActive = true;
    if (getApprovalStatus(user) === "on-hold") {
      updateDoc["investorProfile.approval.status"] = "approved";
      updateDoc["investorProfile.approval.holdReason"] = "";
    }
  }

  if (payload.action === "deactivate") {
    updateDoc.isActive = false;
    if (reason) updateDoc["investorProfile.approval.holdReason"] = reason;
  }

  if (payload.action === "hold") {
    updateDoc.isActive = false;
    updateDoc["investorProfile.approval.status"] = "on-hold";
    updateDoc["investorProfile.approval.holdReason"] = reason || "Temporarily on hold";
  }

  if (payload.action === "unhold") {
    updateDoc.isActive = true;
    updateDoc["investorProfile.approval.holdReason"] = "";
    if (getApprovalStatus(user) === "on-hold") {
      updateDoc["investorProfile.approval.status"] = "approved";
    }
  }

  if (Object.keys(updateDoc).length === 0) {
    throwError("No status changes requested", 400);
  }

  updateDoc["investorProfile.approval.reviewedAt"] = new Date();
  updateDoc["investorProfile.approval.reviewedBy"] = actor.id || actor._id;

  await PlatformUser.findByIdAndUpdate(investorId, { $set: updateDoc }, { new: true }).exec();
  const updated = await findUserById(investorId, { populateRole: true });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: `user.investor.status.${payload.action}`,
    entity: "PlatformUser",
    entityId: investorId,
    before: user.toObject(),
    after: updated?.toObject(),
    metadata: { reason: reason || null },
  });

  try {
    const firstName = updated?.firstName || "Investor";
    const email = updated?.email;
    if (email) {
      const actionLabels = {
        activate: "Account Activated",
        deactivate: "Account Deactivated",
        hold: "Account On Hold",
        unhold: "Account Reactivated",
      };
      const label = actionLabels[payload.action] || "Status Updated";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #1a1a2e; margin-top: 0;">${label}</h2>
            <p style="color: #4b5563;">Hi ${firstName},</p>
            <p style="color: #4b5563;">Your account status has been updated: <strong>${label.toLowerCase()}</strong>.</p>
            ${reason ? `<p style="color: #6b7280;"><strong>Note:</strong> ${reason}</p>` : ""}
            ${payload.action === "activate" || payload.action === "unhold"
              ? '<p style="color: #16a34a; font-weight: bold;">Your account is now active.</p>'
              : '<p style="color: #6b7280; font-size: 14px;">Please contact support if you have questions.</p>'}
          </div>
        </div>
      `;
      await sendEmail({ to: email, subject: `ShareBit - ${label}`, html });
    }
  } catch (_) {
    // email failure should not block the response
  }

  return buildUserResponse(updated);
};

export const reviewInvestorApprovalByAdmin = async (investorId, payload, actor) => {
  const user = await findUserById(investorId, { populateRole: true });
  if (!user) throwError("Investor not found", 404);

  const now = new Date();
  const updateDoc = {
    "investorProfile.approval.reviewedAt": now,
    "investorProfile.approval.reviewedBy": actor.id || actor._id,
    "investorProfile.approval.approvalNote": payload.approvalNote?.trim() || "",
  };

  if (payload.decision === "approved") {
    updateDoc.isActive = true;
    updateDoc["investorProfile.kycStatus"] = "verified";
    updateDoc["investorProfile.approval.status"] = "approved";
    updateDoc["investorProfile.approval.rejectionReason"] = "";
    updateDoc["investorProfile.approval.holdReason"] = "";
  } else {
    updateDoc.isActive = false;
    updateDoc["investorProfile.kycStatus"] = "rejected";
    updateDoc["investorProfile.approval.status"] = "rejected";
    updateDoc["investorProfile.approval.rejectionReason"] =
      payload.rejectionReason?.trim() || "Rejected by admin";
  }

  await PlatformUser.findByIdAndUpdate(investorId, { $set: updateDoc }, { new: true }).exec();
  const updated = await findUserById(investorId, { populateRole: true });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: `user.investor.approval.${payload.decision}`,
    entity: "PlatformUser",
    entityId: investorId,
    before: user.toObject(),
    after: updated?.toObject(),
  });

  try {
    const firstName = updated?.firstName || "Investor";
    const email = updated?.email;
    if (email) {
      const decision = payload.decision === "approved" ? "Approved" : "Rejected";
      const reason = payload.decision === "rejected"
        ? (payload.rejectionReason?.trim() || "Please review and address the issues mentioned by admin.")
        : "";
      const note = payload.approvalNote?.trim() || "";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
          <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #1a1a2e; margin-top: 0;">Profile ${decision}</h2>
            <p style="color: #4b5563;">Hi ${firstName},</p>
            <p style="color: #4b5563;">Your profile has been <strong>${decision.toLowerCase()}</strong> by the admin team.</p>
            ${note ? `<p style="color: #4b5563;"><strong>Admin Note:</strong> ${note}</p>` : ""}
            ${reason ? `<p style="color: #dc2626;"><strong>Reason:</strong> ${reason}</p>` : ""}
            ${payload.decision === "approved"
              ? '<p style="color: #16a34a; font-weight: bold;">You now have full access to all financial features!</p>'
              : '<p style="color: #6b7280; font-size: 14px;">Please update your profile and resubmit for review.</p>'}
          </div>
        </div>
      `;
      await sendEmail({ to: email, subject: `ShareBit - Profile ${decision}`, html });
    }
  } catch (_) {
    // email failure should not block the response
  }

  return buildUserResponse(updated);
};

const hasBankPayout = (profile = {}) => {
  const bank = profile?.payoutDetails?.bankAccount || {};
  return Boolean(bank.bankName && bank.accountHolderName && bank.accountNumber);
};

const hasBkashPayout = (profile = {}) => {
  const bkash = profile?.payoutDetails?.bkash || {};
  return Boolean(bkash.number && bkash.accountType);
};

export const submitInvestorProfileForApproval = async (userId, payload, actor) => {
  const user = await findUserById(userId, { populateRole: true });
  if (!user) throwError("User not found", 404);

  const identitySubmitted = (user.identityDocuments || []).length > 0;
  const payoutSubmitted = hasBankPayout(user.investorProfile) || hasBkashPayout(user.investorProfile);

  if (!identitySubmitted) {
    throwError("Upload at least one identity document before submission", 400);
  }

  if (!payoutSubmitted) {
    throwError("Add at least one payout method (bank or bKash) before submission", 400);
  }

  const now = new Date();
  const updateDoc = {
    "investorProfile.profileCompletion.identitySubmitted": true,
    "investorProfile.profileCompletion.payoutSubmitted": true,
    "investorProfile.profileCompletion.submittedForApproval": true,
    "investorProfile.profileCompletion.completedAt": now,
    "investorProfile.approval.status": "submitted",
    "investorProfile.approval.submittedAt": now,
    "investorProfile.approval.approvalNote": payload.note?.trim() || "",
    "investorProfile.approval.rejectionReason": "",
    "investorProfile.approval.holdReason": "",
  };

  await PlatformUser.findByIdAndUpdate(userId, { $set: updateDoc }, { new: true }).exec();
  const updated = await findUserById(userId, { populateRole: true });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "user.investor.profile.submit",
    entity: "PlatformUser",
    entityId: userId,
    before: user.toObject(),
    after: updated?.toObject(),
  });

  return buildUserResponse(updated);
};

export const listInvestorDocuments = async (investorId) => {
  const user = await findUserById(investorId, { populateRole: false });
  if (!user) throwError("Investor not found", 404);

  return {
    identityDocuments: user.identityDocuments || [],
    otherDocuments: user.otherDocuments || [],
  };
};

export const uploadInvestorDocument = async ({
  targetUserId,
  docType,
  docNumber,
  category,
  file,
  actor,
}) => {
  if (!file?.buffer) throwError("No file uploaded", 400);

  const user = await findUserById(targetUserId, { populateRole: false });
  if (!user) throwError("Investor not found", 404);

  const normalizedCategory = category || "identity";
  if (normalizedCategory === "identity" && !IDENTITY_DOC_TYPES.has(docType)) {
    throwError("Identity document type must be NID, Driving License, or Passport", 400);
  }

  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadBufferToCloudinary(file.buffer, {
      folder: `sharebit/investors/${targetUserId}/${normalizedCategory}`,
      resource_type: "auto",
    });
  } catch (error) {
    throwError(normalizeCloudinaryUploadError(error), 502, {
      provider: "cloudinary",
      cause: error?.message || "unknown",
    });
  }

  if (!cloudinaryResult?.secure_url || !cloudinaryResult?.public_id) {
    throwError("Cloudinary upload completed without valid file metadata", 502, {
      provider: "cloudinary",
    });
  }

  const uploadedBy = actor?.id || actor?._id || user._id;
  const timestamp = new Date();

  let pushedDocument = null;
  if (normalizedCategory === "identity") {
    pushedDocument = {
      docType,
      docNumber: docNumber?.trim() || "N/A",
      fileUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      uploadedAt: timestamp,
      uploadedBy,
      isVerified: false,
    };

    await PlatformUser.findByIdAndUpdate(targetUserId, {
      $push: { identityDocuments: pushedDocument },
      $set: {
        "investorProfile.profileCompletion.identitySubmitted": true,
      },
    }).exec();
  } else {
    pushedDocument = {
      docType,
      docNumber: docNumber?.trim() || undefined,
      fileUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      uploadedAt: timestamp,
      uploadedBy,
    };

    await PlatformUser.findByIdAndUpdate(targetUserId, {
      $push: { otherDocuments: pushedDocument },
    }).exec();
  }

  await logAudit({
    actorId: uploadedBy,
    actorRole: actor?.roleName || "Investor",
    action: "user.investor.document.upload",
    entity: "PlatformUser",
    entityId: targetUserId,
    metadata: {
      category: normalizedCategory,
      docType,
      cloudinaryPublicId: cloudinaryResult.public_id,
    },
  });

  return pushedDocument;
};

export const verifyInvestorDocument = async (investorId, documentId, payload, actor) => {
  const user = await findUserById(investorId, { populateRole: false });
  if (!user) throwError("Investor not found", 404);

  const identityDocs = user.identityDocuments || [];
  const docIndex = identityDocs.findIndex((d) => d._id?.toString() === documentId);
  if (docIndex === -1) throwError("Document not found", 404);

  const { isVerified, verificationNote } = payload;
  if (typeof isVerified !== "boolean") throwError("isVerified must be a boolean", 400);

  const updatePath = `identityDocuments.${docIndex}`;
  const updateDoc = {
    [`${updatePath}.isVerified`]: isVerified,
    [`${updatePath}.verifiedAt`]: new Date(),
  };
  if (typeof verificationNote === "string") {
    updateDoc[`${updatePath}.verificationNote`] = verificationNote.trim();
  }

  await PlatformUser.findByIdAndUpdate(investorId, { $set: updateDoc }, { new: true }).exec();
  const updated = await findUserById(investorId, { populateRole: true });

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: isVerified ? "user.investor.document.verify" : "user.investor.document.reject",
    entity: "PlatformUser",
    entityId: investorId,
    metadata: { documentId, isVerified, verificationNote: verificationNote?.trim() || "" },
  });

  return {
    documentId,
    isVerified,
    verifiedAt: new Date(),
    verificationNote: verificationNote?.trim() || "",
  };
};

export const createInvestorByAdmin = async (data, actor) => {
  const email = data.email.trim().toLowerCase();
  const existingUser = await findUserByEmail(email);
  if (existingUser) throwError("Email already exists", 409);

  const role = await resolveInvestorRole();
  if (!role) throwError("Investor role not found", 500);

  const created = await createUser({
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email,
    password: data.password,
    phone: data.phone?.trim() || undefined,
    country: data.country?.trim() || undefined,
    roleId: role._id,
    isVerified: true,
    isActive: true,
    otpCode: null,
    otpExpiry: null,
    otpStatus: "verified",
    investorProfile: {
      approval: { status: "draft" },
      profileCompletion: {
        identitySubmitted: false,
        payoutSubmitted: false,
        submittedForApproval: false,
      },
    },
  });

  await createWallet({ userId: created._id, balance: 0, currency: "USD" });

  const user = await findUserById(created._id, { populateRole: true });
  if (!user) throwError("Failed to load created user", 500);

  await logAudit({
    actorId: actor.id || actor._id,
    actorRole: actor.roleName,
    action: "user.create",
    entity: "PlatformUser",
    entityId: user._id,
    after: user.toObject(),
    metadata: { source: "admin.investor.create" },
  });

  return buildUserResponse(user);
};
