import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { PlatformRole } from "#models/roleModel.js";
import { PlatformUser } from "#models/userModel.js";
import { Wallet } from "#models/walletModel.js";
import { Asset } from "#models/assetModel.js";
import { ShareAccount } from "#models/shareAccountModel.js";

dotenv.config();

const REQUIRED_ENV = ["MONGO_URI"];

const getEnv = (key, fallback) => {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
};

const ADMIN_EMAIL =
  getEnv("ADMIN_EMAIL") ||
  getEnv("SUPER_ADMIN_EMAIL") ||
  "admin@sharebit.com";

const ADMIN_PASSWORD =
  getEnv("ADMIN_PASSWORD") ||
  getEnv("SUPER_ADMIN_PASSWORD") ||
  "Admin@12345";

const DEMO_USER_EMAIL = getEnv("DEMO_USER_EMAIL") || "user@sharebit.com";
const DEMO_USER_PASSWORD = getEnv("DEMO_USER_PASSWORD") || "User@12345";

const ALL_PERMISSIONS = [
  "*",
  "role:create",
  "role:read",
  "role:update",
  "role:delete",
  "user:create",
  "user:read",
  "user:update",
  "user:delete",
  "user:verify",
  "asset:create",
  "asset:read",
  "asset:update",
  "asset:delete",
  "asset:publish",
  "share:account:read",
  "share:assign",
  "share:payment:create",
  "share:payment:read",
  "share:read",
  "wallet:read",
  "wallet:credit",
  "wallet:debit",
  "transaction:create",
  "transaction:read",
  "profit:read",
  "profit:distribute",
  "withdrawal:read",
  "withdrawal:approve",
  "withdrawal:reject",
  "audit:read",
];

const ROLE_DEFINITIONS = [
  {
    name: "SuperAdmin",
    description: "Full system access",
    permissions: ALL_PERMISSIONS,
    hierarchy: 1,
    isDefault: false,
    isEditable: false,
  },
  {
    name: "Manager",
    description: "Operational management access",
    permissions: [
      "role:read",
      "user:read",
      "user:update",
      "asset:create",
      "asset:read",
      "asset:update",
      "asset:publish",
      "share:account:read",
      "share:assign",
      "share:payment:create",
      "share:payment:read",
      "wallet:read",
      "transaction:read",
      "profit:read",
      "withdrawal:read",
      "withdrawal:approve",
      "withdrawal:reject",
      "audit:read",
      "platform.user:create",
      "platform.user:read",
      "platform.user:update",
      "platform.asset:create",
      "platform.asset:read",
      "platform.asset:update",
      "platform.wallet:read",
      "platform.wallet:manage",
      "platform.audit:read",
      "platform.audit:export",
    ],
    hierarchy: 2,
    isDefault: false,
    isEditable: true,
  },
  {
    name: "User",
    description: "Investor access",
    permissions: [
      "asset:read",
      "share:read",
      "share:account:read",
      "wallet:read",
      "transaction:read",
      "profit:read",
    ],
    hierarchy: 3,
    isDefault: true,
    isEditable: true,
  },
];

const ensureEnv = () => {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(`${key} not defined in .env`);
    }
  }
};

const upsertRoles = async () => {
  for (const role of ROLE_DEFINITIONS) {
    const existing = await PlatformRole.findOne({ name: role.name });
    if (!existing) {
      await PlatformRole.create(role);
      continue;
    }

    if (existing.isEditable) {
      await PlatformRole.findByIdAndUpdate(
        existing._id,
        {
          description: role.description,
          permissions: role.permissions,
          hierarchy: role.hierarchy,
          isDefault: role.isDefault,
        },
        { new: true }
      );
    }
  }
};

const ensureUser = async ({
  firstName,
  lastName,
  email,
  password,
  roleId,
  isSystem = false,
  updateIfExists = false,
}) => {
  const normalizedEmail = email.toLowerCase();
  const existing = await PlatformUser.findOne({ email: normalizedEmail });
  const hashed = await bcrypt.hash(password, 12);

  if (existing) {
    if (!updateIfExists) return existing;

    return PlatformUser.findByIdAndUpdate(
      existing._id,
      {
        firstName,
        lastName,
        email: normalizedEmail,
        password: hashed,
        roleId,
        isVerified: true,
        otpStatus: "verified",
        isActive: true,
        isSystem,
      },
      { new: true }
    );
  }

  const [created] = await PlatformUser.insertMany([
    {
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashed,
      roleId,
      isVerified: true,
      otpStatus: "verified",
      isActive: true,
      isSystem,
    },
  ]);

  return created;
};

const ensureWallet = async (userId) => {
  const existing = await Wallet.findOne({ userId });
  if (!existing) {
    await Wallet.create({ userId, balance: 0, currency: "USD" });
  }
};

const ensureAssetAndShares = async (adminUser) => {
  const assetName = "Demo Bus Asset";
  let asset = await Asset.findOne({ name: assetName });

  if (!asset) {
    const totalShares = 100;
    const sharePrice = 1000;
    const totalSharePrice = totalShares * sharePrice;

    asset = await Asset.create({
      name: assetName,
      description: "Seeded demo bus asset",
      category: "Transport",
      location: "Dhaka",
      totalShares,
      sharePrice,
      totalSharePrice,
      availableShares: totalShares,
      status: "draft",
      createdBy: adminUser._id,
    });
  }

  const existingShareCount = await ShareAccount.countDocuments({
    assetId: asset._id,
  });

  if (existingShareCount === 0) {
    const docs = Array.from({ length: asset.totalShares }, (_, index) => ({
      assetId: asset._id,
      shareNumber: index + 1,
      status: "inactive",
      assignedUserId: null,
      assignedAt: null,
      assignedBy: null,
    }));

    await ShareAccount.insertMany(docs, { ordered: true });
  }

  return asset;
};

const runSeed = async () => {
  ensureEnv();

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  await upsertRoles();

  const superAdminRole = await PlatformRole.findOne({ name: "SuperAdmin" });
  const userRole = await PlatformRole.findOne({ name: "User" });

  if (!superAdminRole || !userRole) {
    throw new Error("Required roles not found after seeding.");
  }

  const adminUser = await ensureUser({
    firstName: "Super",
    lastName: "Admin",
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    roleId: superAdminRole._id,
    updateIfExists: true,
  });

  const demoUser = await ensureUser({
    firstName: "Demo",
    lastName: "User",
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
    roleId: userRole._id,
    updateIfExists: true,
  });

  await ensureWallet(adminUser._id);
  await ensureWallet(demoUser._id);

  await ensureAssetAndShares(adminUser);

  console.log("Seed completed successfully.");

  await mongoose.connection.close();
};

runSeed().catch(async (err) => {
  console.error("Seed failed:", err);
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
