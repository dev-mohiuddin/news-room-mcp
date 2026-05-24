import { PlatformUser } from "#models/userModel.js";
import { PlatformRole } from "#models/roleModel.js";

export const initSystemCompanyUser = async () => {
  try {
    const email = process.env.COMPANY_SYSTEM_EMAIL || "company@sharebit.com";
    const password = process.env.COMPANY_SYSTEM_PASSWORD || "Company@12345";

    const existing = await PlatformUser.findOne({ email });
    if (existing) return;

    const superAdminRole = await PlatformRole.findOne({ name: "SuperAdmin" });
    if (!superAdminRole) {
      console.error("CRITICAL: SuperAdmin role not found. Cannot create system user.");
      process.exit(1);
    }

    await PlatformUser.create({
      firstName: "System",
      lastName: "Company",
      email,
      password,
      roleId: superAdminRole._id,
      isVerified: true,
      isActive: true,
      isSystem: true,
    });

    console.log(`System Company user created: ${email}`);
  } catch (err) {
    console.error("Error creating system company user:", err.message);
  }
};
