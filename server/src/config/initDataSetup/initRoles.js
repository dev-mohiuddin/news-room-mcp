import { PlatformRole } from "#models/roleModel.js";
import { PLATFORM_ROLES } from "#constants/roles.js";

const sortPermissions = (permissions = []) => [...permissions].sort();

const arePermissionsEqual = (left = [], right = []) => {
  const a = sortPermissions(left);
  const b = sortPermissions(right);
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
};

export const initPlatformRoles = async () => {
  try {
    await Promise.all(
      PLATFORM_ROLES.map(async (roleData) => {
        const existingRole = await PlatformRole.findOne({ name: roleData.name });
        if (!existingRole) {
          await PlatformRole.create(roleData);
          console.log(`Platform Role created: ${roleData.name}`);
          return;
        }

        const shouldSync =
          existingRole.description !== roleData.description ||
          existingRole.hierarchy !== roleData.hierarchy ||
          existingRole.isDefault !== roleData.isDefault ||
          !arePermissionsEqual(existingRole.permissions, roleData.permissions);

        if (shouldSync) {
          existingRole.description = roleData.description;
          existingRole.permissions = roleData.permissions;
          existingRole.hierarchy = roleData.hierarchy;
          existingRole.isDefault = roleData.isDefault;
          await existingRole.save();
          console.log(`Platform Role synced: ${roleData.name}`);
        }
      })
    );

    console.log("Platform roles initialization check complete.");
  } catch (err) {
    console.error("Critical Error initializing platform roles:", err.message);
    process.exit(1);
  }
};
