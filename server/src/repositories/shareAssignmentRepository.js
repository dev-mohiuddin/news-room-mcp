import { ShareAssignment } from "#models/shareAssignmentModel.js";

export const createShareAssignment = async (data) => {
  return ShareAssignment.create(data);
};

export const getActiveAssignment = async (shareAccountId) => {
  return ShareAssignment.findOne({ shareAccountId, status: "active" }).exec();
};

export const listAssignmentsByUser = async (userId) => {
  return ShareAssignment.find({ userId }).exec();
};
