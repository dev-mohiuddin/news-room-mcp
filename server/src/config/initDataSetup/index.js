import { initPlatformRoles } from "#config/initDataSetup/initRoles.js";
import { initSuperAdmin } from "#config/initDataSetup/initSuperAdmin.js";
import { initSystemCompanyUser } from "#config/initDataSetup/initSystemCompanyUser.js";
import { initAssetValues } from "#config/initDataSetup/initAssetValues.js";

export const initData = async () => {
  await initPlatformRoles();
  await initSuperAdmin();
  await initSystemCompanyUser();
  await initAssetValues();
};
