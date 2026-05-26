import { logger } from "#utils/logger.js";
import { User } from "#models/userModel.js";
import { Role } from "#models/roleModel.js";
import { Workspace } from "#models/workspaceModel.js";
import { ROLE_NAMES, ROLE_SCOPES } from "#constants/roles.js";
import { ensureSubscription } from "#repositories/subscriptionRepository.js";

/**
 * Seeds two demo accounts on first DB connection:
 *   1. Super Admin → admin@newsroommcp.com  / Admin@12345
 *   2. Demo Owner  → user@newsroommcp.com   / User@12345
 *
 * Both pre-verified. Demo cards on the login page hit real /auth/login
 * with these credentials.
 *
 * Tenant accounts get a workspace created automatically.
 *
 * Idempotent — does not overwrite if accounts already exist.
 */
const SEED_ACCOUNTS = [
  {
    name: "Super Admin",
    email: process.env.SUPER_ADMIN_EMAIL || "admin@newsroommcp.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "Admin@12345",
    roleName: ROLE_NAMES.SUPER_ADMIN,
  },
  {
    name: "Sarah Chen",
    email: process.env.DEMO_USER_EMAIL || "user@newsroommcp.com",
    password: process.env.DEMO_USER_PASSWORD || "User@12345",
    roleName: ROLE_NAMES.WORKSPACE_OWNER,
  },
];

const slugify = (s) =>
  s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "").slice(0, 40);

export const initSuperAdmin = async () => {
  for (const seed of SEED_ACCOUNTS) {
    const existing = await User.findOne({ email: seed.email });
    if (existing) {
      logger.info(`Seed account already exists: ${seed.email}`);
      continue;
    }

    const role = await Role.findOne({ name: seed.roleName });
    if (!role) {
      logger.error(`Cannot seed user — role '${seed.roleName}' missing`);
      continue;
    }

    const user = await User.create({
      name: seed.name,
      email: seed.email,
      password: seed.password,
      roleId: role._id,
      isVerified: true,
      isActive: true,
      authProvider: "local",
    });

    // Tenant users get a workspace
    if (role.scope === ROLE_SCOPES.TENANT) {
      const ws = await Workspace.create({
        name: `${seed.name}'s workspace`,
        slug: `${slugify(seed.name)}-${user._id.toString().slice(-6)}`,
        ownerId: user._id,
      });
      user.workspaceId = ws._id;
      await user.save();
      // Seed a `pro` subscription so demo data shows realistic limits.
      await ensureSubscription(ws._id, { plan: "pro", anchor: new Date() });
      logger.info(`Workspace + subscription created for ${seed.email}`);
    }

    logger.info(`Seed account created: ${seed.email} (${seed.roleName})`);
  }
};
