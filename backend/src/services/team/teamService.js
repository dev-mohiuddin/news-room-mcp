import crypto from "node:crypto";

import {
  findUserById,
  findUserByEmail,
  listWorkspaceMembers,
  updateUserById,
  deleteUserById,
  createUser,
} from "#repositories/userRepository.js";
import { findRoleById, findRoleByName } from "#repositories/roleRepository.js";
import { findWorkspaceById } from "#repositories/workspaceRepository.js";
import {
  findInvitationByTokenHash,
  findActivePendingInvite,
  listInvitationsByWorkspace,
  createInvitation,
  updateInvitationById,
  deleteInvitationById,
} from "#repositories/invitationRepository.js";
import { Invitation } from "#models/invitationModel.js";
import {
  ROLE_NAMES,
  ROLE_SCOPES,
} from "#constants/roles.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { sendInvitationEmail } from "#utils/emailUtil.js";
import { logAudit } from "#utils/auditLogger.js";

const INVITE_EXPIRY_DAYS = 7;
const ALLOWED_INVITE_ROLES = [
  ROLE_NAMES.EDITOR,
  ROLE_NAMES.WRITER,
  ROLE_NAMES.VIEWER,
];

/* ──────────────────────────────────────────────────────────
 *  Helpers
 * ────────────────────────────────────────────────────────── */
const ensureWorkspaceMember = (user) => {
  if (!user.workspaceId) {
    throwError("Your account is not attached to a workspace.", 400);
  }
};

const ensureCanManageTeam = (user) => {
  if (!user.permissions?.includes("*") && !user.permissions?.includes("tenant.team:manage")) {
    throwError("You don't have permission to manage the team", 403);
  }
};

/* ──────────────────────────────────────────────────────────
 *  List members + invites
 * ────────────────────────────────────────────────────────── */
export const listTeam = async (actor) => {
  ensureWorkspaceMember(actor);
  const [members, invites] = await Promise.all([
    listWorkspaceMembers(actor.workspaceId),
    listInvitationsByWorkspace(actor.workspaceId, "pending"),
  ]);
  return { members, invites };
};

/* ──────────────────────────────────────────────────────────
 *  Invite a new member
 * ────────────────────────────────────────────────────────── */
export const inviteMember = async ({ actor, email, roleName, req }) => {
  ensureCanManageTeam(actor);
  ensureWorkspaceMember(actor);

  const normalizedEmail = email.toLowerCase().trim();

  // Self-invite block
  if (normalizedEmail === actor.email.toLowerCase()) {
    throwError("You cannot invite yourself", 400);
  }

  // Allowed role check (cannot invite as workspace_owner)
  if (!ALLOWED_INVITE_ROLES.includes(roleName)) {
    throwError(
      `Role '${roleName}' is not allowed for team invitations`,
      400
    );
  }

  // Existing user with same email already in this workspace?
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser?.workspaceId?.toString() === actor.workspaceId) {
    throwError("This user is already part of your workspace", 409);
  }
  if (existingUser && existingUser.workspaceId) {
    throwError("This email belongs to another workspace", 409);
  }

  // Pending invite already exists?
  const pending = await findActivePendingInvite(normalizedEmail, actor.workspaceId);
  if (pending) throwError("An invitation is already pending for this email", 409);

  const role = await findRoleByName(roleName);
  if (!role || role.scope !== ROLE_SCOPES.TENANT) {
    throwError("Invalid role for tenant invitation", 400);
  }

  // Generate token (raw → emailed, hashed → stored)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = Invitation.hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = await createInvitation({
    workspaceId: actor.workspaceId,
    email: normalizedEmail,
    roleId: role._id,
    invitedBy: actor.id,
    tokenHash,
    status: "pending",
    expiresAt,
  });

  const baseUrl = process.env.CLIENT_APP_ORIGIN || "http://localhost:5173";
  const inviteUrl = `${baseUrl}/auth/accept-invite/${rawToken}`;

  // Best-effort email — don't fail the request if SMTP is down
  try {
    await sendInvitationEmail(normalizedEmail, {
      inviteUrl,
      inviterName: actor.name,
      roleName: role.displayName,
    });
  } catch (err) {
    // logged inside sendInvitationEmail; we return inviteUrl in dev for testing
  }

  await logAudit({
    actor,
    category: "team",
    action: "team.invited",
    entityType: "invitation",
    entityId: invite._id,
    workspaceId: actor.workspaceId,
    after: { email: normalizedEmail, role: role.name },
    req,
  });

  return {
    invite: {
      id: invite._id,
      email: invite.email,
      role: role.name,
      roleDisplayName: role.displayName,
      sentAt: invite.createdAt,
      expiresAt: invite.expiresAt,
    },
    // Returned in dev only so testing without email is possible
    inviteUrl: process.env.NODE_ENV === "production" ? undefined : inviteUrl,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Resend invite
 * ────────────────────────────────────────────────────────── */
export const resendInvite = async ({ actor, inviteId, req }) => {
  ensureCanManageTeam(actor);
  const invite = await Invitation.findById(inviteId);
  if (!invite) throwError("Invitation not found", 404);
  if (invite.workspaceId.toString() !== actor.workspaceId) throwError("Not allowed", 403);
  if (invite.status !== "pending") throwError("Only pending invites can be resent", 400);

  const rawToken = crypto.randomBytes(32).toString("hex");
  invite.tokenHash = Invitation.hashToken(rawToken);
  invite.expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await invite.save();

  const role = await findRoleById(invite.roleId);
  const baseUrl = process.env.CLIENT_APP_ORIGIN || "http://localhost:5173";
  const inviteUrl = `${baseUrl}/auth/accept-invite/${rawToken}`;

  try {
    await sendInvitationEmail(invite.email, {
      inviteUrl,
      inviterName: actor.name,
      roleName: role?.displayName || "Team member",
    });
  } catch {
    /* swallow */
  }

  await logAudit({
    actor,
    category: "team",
    action: "team.invite_resent",
    entityType: "invitation",
    entityId: invite._id,
    workspaceId: actor.workspaceId,
    req,
  });

  return {
    sentAt: invite.updatedAt,
    inviteUrl: process.env.NODE_ENV === "production" ? undefined : inviteUrl,
  };
};

/* ──────────────────────────────────────────────────────────
 *  Cancel invite
 * ────────────────────────────────────────────────────────── */
export const cancelInvite = async ({ actor, inviteId, req }) => {
  ensureCanManageTeam(actor);
  const invite = await Invitation.findById(inviteId);
  if (!invite) throwError("Invitation not found", 404);
  if (invite.workspaceId.toString() !== actor.workspaceId) throwError("Not allowed", 403);
  if (invite.status !== "pending") throwError("Only pending invites can be cancelled", 400);

  await updateInvitationById(invite._id, {
    status: "cancelled",
    cancelledAt: new Date(),
  });

  await logAudit({
    actor,
    category: "team",
    action: "team.invite_cancelled",
    entityType: "invitation",
    entityId: invite._id,
    workspaceId: actor.workspaceId,
    req,
  });

  return { cancelled: true };
};

/* ──────────────────────────────────────────────────────────
 *  Change a member's role
 * ────────────────────────────────────────────────────────── */
export const changeMemberRole = async ({ actor, memberId, roleName, req }) => {
  ensureCanManageTeam(actor);
  if (memberId === actor.id) {
    throwError("You cannot change your own role", 400);
  }
  if (!ALLOWED_INVITE_ROLES.includes(roleName)) {
    throwError("Owner role cannot be assigned via team management", 400);
  }

  const member = await findUserById(memberId);
  if (!member) throwError("Member not found", 404);
  if (member.workspaceId?.toString() !== actor.workspaceId) {
    throwError("Member is not part of your workspace", 403);
  }
  if (member.roleId?.name === ROLE_NAMES.WORKSPACE_OWNER) {
    throwError("The workspace owner's role cannot be changed here", 400);
  }

  const newRole = await findRoleByName(roleName);
  if (!newRole || newRole.scope !== ROLE_SCOPES.TENANT) {
    throwError("Invalid tenant role", 400);
  }

  const before = { role: member.roleId?.name };
  const updated = await updateUserById(memberId, { roleId: newRole._id });

  await logAudit({
    actor,
    category: "team",
    action: "team.role_changed",
    entityType: "user",
    entityId: updated._id,
    workspaceId: actor.workspaceId,
    before,
    after: { role: newRole.name },
    req,
  });

  return updated;
};

/* ──────────────────────────────────────────────────────────
 *  Remove a member
 * ────────────────────────────────────────────────────────── */
export const removeMember = async ({ actor, memberId, req }) => {
  ensureCanManageTeam(actor);
  if (memberId === actor.id) throwError("You cannot remove yourself", 400);

  const member = await findUserById(memberId);
  if (!member) throwError("Member not found", 404);
  if (member.workspaceId?.toString() !== actor.workspaceId) {
    throwError("Member is not part of your workspace", 403);
  }
  if (member.roleId?.name === ROLE_NAMES.WORKSPACE_OWNER) {
    throwError("The workspace owner cannot be removed", 400);
  }

  await deleteUserById(memberId);

  await logAudit({
    actor,
    category: "team",
    action: "team.member_removed",
    entityType: "user",
    entityId: memberId,
    workspaceId: actor.workspaceId,
    before: { email: member.email, role: member.roleId?.name },
    req,
  });

  return { removed: true };
};

/* ──────────────────────────────────────────────────────────
 *  Accept invite (public — token validated)
 * ────────────────────────────────────────────────────────── */
export const acceptInvite = async ({ token, name, password }) => {
  const tokenHash = Invitation.hashToken(token);
  const invite = await findInvitationByTokenHash(tokenHash);
  if (!invite) throwError("Invalid invitation", 400);
  if (invite.status !== "pending") throwError("Invitation is no longer active", 400);
  if (invite.expiresAt < new Date()) {
    await updateInvitationById(invite._id, { status: "expired" });
    throwError("Invitation has expired", 400);
  }

  const workspace = await findWorkspaceById(invite.workspaceId);
  if (!workspace) throwError("Workspace no longer exists", 404);

  // If a user with that email already exists, we just attach them.
  // Otherwise create a new user with the invited role + workspace.
  const existing = await findUserByEmail(invite.email);
  let user;
  if (existing) {
    if (existing.workspaceId) {
      throwError("This email already belongs to a workspace", 409);
    }
    user = await updateUserById(existing._id, {
      workspaceId: workspace._id,
      roleId: invite.roleId._id,
      isVerified: true,
    });
  } else {
    if (!password) throwError("Password is required for new accounts", 400);
    if (!name) throwError("Name is required for new accounts", 400);

    user = await createUser({
      name,
      email: invite.email,
      password,
      roleId: invite.roleId._id,
      workspaceId: workspace._id,
      isVerified: true,
      isActive: true,
      authProvider: "local",
    });
    user = await findUserById(user._id);
  }

  await updateInvitationById(invite._id, {
    status: "accepted",
    acceptedAt: new Date(),
  });

  await logAudit({
    actor: { id: user._id, email: user.email, role: invite.roleId.name },
    category: "team",
    action: "team.invite_accepted",
    entityType: "user",
    entityId: user._id,
    workspaceId: workspace._id,
  });

  return { user, workspace };
};

/* ──────────────────────────────────────────────────────────
 *  Inspect invite (public — used to pre-fill the accept page)
 * ────────────────────────────────────────────────────────── */
export const inspectInvite = async (token) => {
  const invite = await findInvitationByTokenHash(Invitation.hashToken(token));
  if (!invite) throwError("Invalid invitation", 400);

  const usable =
    invite.status === "pending" && invite.expiresAt > new Date();

  return {
    valid: usable,
    status: invite.status,
    email: invite.email,
    roleName: invite.roleId?.name,
    roleDisplayName: invite.roleId?.displayName,
    workspaceName: invite.workspaceId?.name,
    expiresAt: invite.expiresAt,
  };
};
