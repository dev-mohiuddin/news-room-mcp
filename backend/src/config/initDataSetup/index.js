import { logger } from "#utils/logger.js";
import { initPlatformRoles } from "#config/initDataSetup/initRoles.js";
import { initSuperAdmin } from "#config/initDataSetup/initSuperAdmin.js";

/**
 * Idempotent seeders run on every startup. Add new seed steps here.
 *
 * Order matters — roles MUST exist before any user is created.
 */
export const initData = async () => {
  try {
    await initPlatformRoles();
    await initSuperAdmin();
    logger.info("Init data seed complete");
  } catch (err) {
    logger.error("Init data seed failed", { error: err.message });
  }
};
