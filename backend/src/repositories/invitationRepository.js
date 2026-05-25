import { Invitation } from "#models/invitationModel.js";

export const findInvitationByTokenHash = (tokenHash) =>
  Invitation.findOne({ tokenHash }).populate("roleId").populate("workspaceId").exec();

export const findActivePendingInvite = (email, workspaceId) =>
  Invitation.findOne({
    email,
    workspaceId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).exec();

export const listInvitationsByWorkspace = (workspaceId, status = "pending") =>
  Invitation.find({ workspaceId, status })
    .populate("roleId", "name displayName")
    .populate("invitedBy", "name email")
    .sort({ createdAt: -1 })
    .exec();

export const createInvitation = (data) => Invitation.create(data);

export const updateInvitationById = (id, data) =>
  Invitation.findByIdAndUpdate(id, data, { new: true }).exec();

export const deleteInvitationById = (id) => Invitation.findByIdAndDelete(id).exec();
