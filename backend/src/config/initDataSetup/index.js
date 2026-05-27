import { logger } from "#utils/logger.js";
import { initPlatformRoles } from "#config/initDataSetup/initRoles.js";
import { initSuperAdmin } from "#config/initDataSetup/initSuperAdmin.js";
import { initPlans } from "#config/initDataSetup/initPlans.js";
import { initSystemSettings } from "#config/initDataSetup/initSystemSettings.js";
import {
  migrateWorkspacePlan,
  assertWorkspaceSchemaClean,
} from "#config/initDataSetup/migrateWorkspacePlan.js";

/**
 * Idempotent seeders run on every startup.
 * Order matters:
 *   1. assert schema cleanliness
 *   2. roles (super_admin needed by initSuperAdmin)
 *   3. plans (workspace subscriptions reference plan codes)
 *   4. migrate legacy workspace.plan → subscription.plan
 *   5. seed demo super-admin + workspace_owner accounts
 *   6. seed system settings (singleton + canonical feature flags)
 */
export const initData = async () => {
  try {
    assertWorkspaceSchemaClean();
    await initPlatformRoles();
    await initPlans();
    await migrateWorkspacePlan();
    await initSuperAdmin();
    await initSystemSettings();
    logger.info("Init data seed complete");
  } catch (err) {
    logger.error("Init data seed failed", {
      error: err.message,
      stack: err.stack,
    });
  }
};
