import { logger } from "#utils/logger.js";
import { ROLE_NAMES } from "#constants/roles.js";

/**
 * Seeds a SuperAdmin user from env credentials.
 *
 * STUB: Activates once `userModel.js` and `roleModel.js` exist.
 * Until then, just logs the intended SuperAdmin email.
 */
export const initSuperAdmin = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@newsroommcp.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "Admin@12345";

  let User, Role;
  try {
    const userMod = await import("#models/userModel.js");
    const roleMod = await import("#models/roleModel.js");
    User = userMod.User || userMod.default;
    Role = roleMod.Role || roleMod.default;
  } catch {
    logger.info(
      `[initSuperAdmin] Skipped — User or Role model not present yet. Planned email: ${email}`
    );
    return;
  }

  if (!User || !Role) return;

  const existing = await User.findOne({ email });
  if (existing) {
    logger.info("SuperAdmin already exists");
    return;
  }

  const role = await Role.findOne({ name: ROLE_NAMES.SUPER_ADMIN });
  if (!role) {
    logger.error("SuperAdmin role not found — cannot seed user");
    return;
  }

  await User.create({
    name: "Super Admin",
    email,
    password, // Hashed via mongoose pre-save hook in userModel
    roleId: role._id,
    role: ROLE_NAMES.SUPER_ADMIN,
    isVerified: true,
    isActive: true,
  });

  logger.info("SuperAdmin created", { email });
};
