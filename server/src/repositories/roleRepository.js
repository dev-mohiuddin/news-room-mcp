import { PlatformRole } from "#models/roleModel.js";

export const findRoleById = async (id) => {
  return PlatformRole.findById(id).exec();
};

export const findRoleByName = async (name) => {
  return PlatformRole.findOne({ name }).exec();
};

export const findDefaultRole = async () => {
  return PlatformRole.findOne({ isDefault: true }).exec();
};

export const getAllRoles = async () => {
  return PlatformRole.find().exec();
};
