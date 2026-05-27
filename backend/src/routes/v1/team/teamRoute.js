import express from "express";

import {
  listTeam,
  inviteMember,
  resendInvite,
  cancelInvite,
  changeMemberRole,
  removeMember,
  inspectInvite,
  acceptInvite,
} from "#controllers/team/teamController.js";

import { protect } from "#middlewares/authMiddleware.js";
import { tenantScope } from "#middlewares/tenantScopeMiddleware.js";
import { requirePermission } from "#middlewares/permissionMiddleware.js";
import { validate } from "#middlewares/validateMiddleware.js";

import {
  inviteSchema,
  inviteIdParamSchema,
  memberRoleSchema,
  memberIdParamSchema,
  inviteTokenParamSchema,
  acceptInviteSchema,
} from "#validations/team/teamValidation.js";

import { PERMISSIONS } from "#constants/roles.js";

export const teamRouter = express.Router();

/* ──────────────────────────────────────────────────────────
 *  Public — invitation acceptance flow
 *  These routes MUST stay outside `protect` + `tenantScope`
 *  because the user accepting may not yet have a workspace.
 * ────────────────────────────────────────────────────────── */
teamRouter.get(
  "/auth/invitations/:token",
  validate(inviteTokenParamSchema),
  inspectInvite
);
teamRouter.post(
  "/auth/invitations/:token/accept",
  validate(acceptInviteSchema),
  acceptInvite
);

/* ──────────────────────────────────────────────────────────
 *  Authenticated workspace endpoints
 *
 *  `tenantScope` is now enforced at the router level so every
 *  route below this line guarantees `req.tenant.workspaceId`
 *  exists and the actor belongs to a tenant workspace
 *  (platform admins are blocked with 403 TENANT_SCOPE_REQUIRED).
 *
 *  This brings /team in line with /articles, /cms, /brand-voice,
 *  /billing, /support, and /analytics — closing the documented
 *  gap in tenantScopeMiddleware.js.
 * ────────────────────────────────────────────────────────── */
teamRouter.use("/team", protect, tenantScope);

/* Read team — anyone in the workspace */
teamRouter.get("/team", listTeam);

/* Manage — only members with tenant.team:manage */
const canManage = requirePermission(PERMISSIONS.TENANT_TEAM_MANAGE);

teamRouter.post(
  "/team/invitations",
  canManage,
  validate(inviteSchema),
  inviteMember
);
teamRouter.post(
  "/team/invitations/:id/resend",
  canManage,
  validate(inviteIdParamSchema),
  resendInvite
);
teamRouter.delete(
  "/team/invitations/:id",
  canManage,
  validate(inviteIdParamSchema),
  cancelInvite
);

teamRouter.patch(
  "/team/members/:id/role",
  canManage,
  validate(memberRoleSchema),
  changeMemberRole
);
teamRouter.delete(
  "/team/members/:id",
  canManage,
  validate(memberIdParamSchema),
  removeMember
);

export default teamRouter;
