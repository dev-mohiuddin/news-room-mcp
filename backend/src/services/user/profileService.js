import {
  findUserById,
  findUserByEmail,
  updateUserById,
} from "#repositories/userRepository.js";
import { findWorkspaceById } from "#repositories/workspaceRepository.js";
import { Workspace } from "#models/workspaceModel.js";
import { User } from "#models/userModel.js";
import { hashPassword } from "#utils/bcryptUtil.js";
import { throwError } from "#utils/throwErrorUtil.js";
import { logAudit } from "#utils/auditLogger.js";

/**
 * ============================================================
 *  Profile + workspace settings (tenant)
 * ============================================================
 *
 *  Backs the /dashboard/settings page. All endpoints are
 *  workspace-scoped via tenantScope middleware.
 *
 *   - getMyProfile         → returns user + workspace + preferences
 *   - updateMyProfile      → name, avatar, timezone, language
 *   - changeMyPassword     → current + new password
 *   - updateMyNotificationPrefs → email/in-app toggles
 *   - updateMyWorkspace    → name (owner only)
 */

const PROFILE_FIELDS = ["name", "avatar", "timezone", "language"];
const PROFILE_PREFERENCE_FIELDS = ["timezone", "language"];

/* User schema does NOT have timezone/language/notification fields by
 * default — we persist them under `user.preferences` (a generic Map).
 * Mongoose `Mixed` allows partial updates without schema migration. */

const sanitizeUser = (user) => ({
  id: user._id?.toString(),
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.roleId?.name || null,
  roleDisplayName: user.roleId?.displayName || null,
  isVerified: user.isVerified,
  authProvider: user.authProvider,
  preferences: user.preferences || {},
  createdAt: user.createdAt,
});

const sanitizeWorkspace = (ws) => {
  if (!ws) return null;
  return {
    id: ws._id?.toString(),
    name: ws.name,
    slug: ws.slug,
    settings: ws.settings || {},
    createdAt: ws.createdAt,
  };
};

export const getMyProfile = async ({ userId, workspaceId }) => {
  const user = await findUserById(userId);
  if (!user) throwError("User not found", 404);
  const workspace = workspaceId ? await findWorkspaceById(workspaceId) : null;
  return {
    user: sanitizeUser(user),
    workspace: sanitizeWorkspace(workspace),
  };
};

export const updateMyProfile = async ({ userId, payload, req }) => {
  const allowed = {};
  if (typeof payload?.name === "string") {
    const name = payload.name.trim();
    if (!name) throwError("Name cannot be empty", 400);
    if (name.length > 80) throwError("Name is too long", 400);
    allowed.name = name;
  }
  if (typeof payload?.avatar === "string") {
    allowed.avatar = payload.avatar.trim() || null;
  }

  /* Preferences live under `preferences` so the user schema doesn't
   * grow forever. We merge instead of replacing so unrelated keys
   * survive each call. */
  const before = await findUserById(userId);
  if (!before) throwError("User not found", 404);

  const nextPreferences = { ...(before.preferences || {}) };
  for (const key of PROFILE_PREFERENCE_FIELDS) {
    if (typeof payload?.[key] === "string") {
      nextPreferences[key] = payload[key].trim().slice(0, 40);
    }
  }
  if (Object.keys(allowed).length === 0 && Object.keys(payload || {}).length === 0) {
    return sanitizeUser(before);
  }

  const updated = await updateUserById(userId, {
    ...allowed,
    preferences: nextPreferences,
  });

  await logAudit({
    actorId: userId,
    category: "account",
    action: "profile.updated",
    entityType: "user",
    entityId: userId,
    after: Object.fromEntries(
      Object.entries({ ...allowed, preferences: nextPreferences })
    ),
    req,
  });

  return sanitizeUser(updated);
};

export const changeMyPassword = async ({
  userId,
  currentPassword,
  newPassword,
  req,
}) => {
  if (!newPassword || newPassword.length < 8) {
    throwError("New password must be at least 8 characters", 400);
  }
  if (currentPassword === newPassword) {
    throwError("New password must differ from the current one", 400);
  }

  /* Need the password column — userRepository hides it by default */
  const user = await User.findById(userId).select("+password").exec();
  if (!user) throwError("User not found", 404);

  if (user.authProvider === "google" && !user.password) {
    throwError(
      "Your account uses Google sign-in. Set up a password via the password reset flow first.",
      400
    );
  }
  const ok = await user.comparePassword(currentPassword || "");
  if (!ok) throwError("Current password is incorrect", 400);

  user.password = await hashPassword(newPassword);
  await user.save();

  await logAudit({
    actorId: userId,
    category: "security",
    action: "password.changed",
    entityType: "user",
    entityId: userId,
    req,
  });

  return { changed: true };
};

const NOTIFICATION_KEYS = [
  "emailArticleReady",
  "emailFailures",
  "emailWeeklyDigest",
  "inappArticleReady",
  "inappFailures",
];

export const updateMyNotificationPrefs = async ({ userId, payload, req }) => {
  const before = await findUserById(userId);
  if (!before) throwError("User not found", 404);

  const next = {
    ...(before.preferences?.notifications || {}),
  };
  for (const key of NOTIFICATION_KEYS) {
    if (typeof payload?.[key] === "boolean") next[key] = payload[key];
  }

  const updated = await updateUserById(userId, {
    preferences: {
      ...(before.preferences || {}),
      notifications: next,
    },
  });

  await logAudit({
    actorId: userId,
    category: "account",
    action: "profile.notifications_updated",
    entityType: "user",
    entityId: userId,
    after: next,
    req,
  });

  return sanitizeUser(updated).preferences?.notifications || next;
};

export const updateMyWorkspace = async ({
  userId,
  workspaceId,
  payload,
  req,
}) => {
  if (!workspaceId) throwError("Workspace not found", 404);
  const ws = await findWorkspaceById(workspaceId);
  if (!ws) throwError("Workspace not found", 404);

  /* Only the workspace owner may rename the workspace. */
  if (ws.ownerId.toString() !== userId) {
    throwError("Only the workspace owner can update workspace settings", 403);
  }

  const updates = {};
  if (typeof payload?.name === "string") {
    const name = payload.name.trim();
    if (!name) throwError("Workspace name cannot be empty", 400);
    if (name.length > 80) throwError("Workspace name is too long", 400);
    updates.name = name;
  }

  if (Object.keys(updates).length === 0) {
    return sanitizeWorkspace(ws);
  }

  const updated = await Workspace.findByIdAndUpdate(workspaceId, {
    $set: updates,
  }, { new: true }).exec();

  await logAudit({
    actorId: userId,
    category: "account",
    action: "workspace.updated",
    entityType: "workspace",
    entityId: workspaceId,
    workspaceId,
    after: updates,
    req,
  });

  return sanitizeWorkspace(updated);
};
