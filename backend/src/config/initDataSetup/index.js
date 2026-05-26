import { logger } from "#utils/logger.js";
import { initPlatformRoles } from "#config/initDataSetup/initRoles.js";
import { initSuperAdmin } from "#config/initDataSetup/initSuperAdmin.js";
import {
  migrateWorkspacePlan,
  assertWorkspaceSchemaClean,
} from "#config/initDataSetup/migrateWorkspacePlan.js";

/**
 * Idempotent seeders run on every startup.
 * Order matters — roles MUST exist before any user is created.
 */
export const initData = async () => {
  try {
    assertWorkspaceSchemaClean();
    await initPlatformRoles();
    await migrateWorkspacePlan();
    await initSuperAdmin();
    logger.info("Init data seed complete");
  } catch (err) {
    logger.error("Init data seed failed", {
      error: err.message,
      stack: err.stack,
    });
  }
};
