import { logger } from "#utils/logger.js";
import { PLATFORM_ROLES } from "#constants/roles.js";

/**
 * Seeds the SuperAdmin + User roles into the Role collection.
 *
 * STUB: This function only runs once a Role model is added.
 * Until then, it logs the planned role definitions for verification.
 *
 * To activate, create `src/models/roleModel.js` exporting `Role`,
 * then uncomment the import + create/update logic below.
 */
export const initPlatformRoles = async () => {
  // Lazy import — safe even when the model doesn't exist yet.
  let Role;
  try {
    const mod = await import("#models/roleModel.js");
    Role = mod.Role || mod.default;
  } catch {
    logger.info(
      `[initRoles] Skipped — roleModel.js not present yet. Planned roles: ${PLATFORM_ROLES.map((r) => r.name).join(", ")}`
    );
    return;
  }

  if (!Role) return;

  for (const roleData of PLATFORM_ROLES) {
    const existing = await Role.findOne({ name: roleData.name });
    if (!existing) {
      await Role.create(roleData);
      logger.info(`Role created: ${roleData.name}`);
      continue;
    }

    const dirty =
      existing.description !== roleData.description ||
      existing.hierarchy !== roleData.hierarchy ||
      existing.isDefault !== roleData.isDefault ||
      JSON.stringify([...(existing.permissions || [])].sort()) !==
        JSON.stringify([...roleData.permissions].sort());

    if (dirty) {
      Object.assign(existing, roleData);
      await existing.save();
      logger.info(`Role synced: ${roleData.name}`);
    }
  }
};
