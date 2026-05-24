import { PlatformUser } from "#models/userModel.js";
import { PlatformRole } from "#models/roleModel.js";

export const getCompanyUser = async () => {
  const systemUser = await PlatformUser.findOne({ isSystem: true }).exec();
  if (systemUser) return systemUser;

  const email = process.env.COMPANY_SYSTEM_EMAIL;
  if (email) {
    const byEmail = await PlatformUser.findOne({ email }).exec();
    if (byEmail) return byEmail;
  }

  const role = await PlatformRole.findOne({ name: "SuperAdmin" }).exec();
  if (!role) return null;
  return PlatformUser.findOne({ roleId: role._id }).exec();
};
