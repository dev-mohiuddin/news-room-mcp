import { logger } from "#utils/logger.js";
import { Role } from "#models/roleModel.js";
import { SEEDED_ROLES } from "#constants/roles.js";

/**
 * Idempotent role seeder.
 *
 *   - Seeded roles missing in DB → created
 *   - Seeded roles existing in DB → permissions/displayName synced (so deploys
 *     that change the static catalog automatically reflect)
 *   - Custom platform roles created via /admin/roles → never touched
 *
 * The seeder ONLY touches roles whose `name` matches a SEEDED_ROLES entry.
 */
export const initPlatformRoles = async () => {
  for (const seed of SEEDED_ROLES) {
    const existing = await Role.findOne({ name: seed.name });

    if (!existing) {
      await Role.create(seed);
      logger.info(`Role created: ${seed.name} (${seed.scope})`);
      continue;
    }

    const dirty =
      existing.displayName !== seed.displayName ||
      existing.description !== seed.description ||
      existing.scope !== seed.scope ||
      existing.isDefault !== seed.isDefault ||
      existing.isSystem !== seed.isSystem ||
      existing.isStatic !== seed.isStatic ||
      JSON.stringify([...(existing.permissions || [])].sort()) !==
        JSON.stringify([...seed.permissions].sort());

    if (dirty) {
      Object.assign(existing, seed);
      await existing.save();
      logger.info(`Role synced: ${seed.name}`);
    }
  }
};
