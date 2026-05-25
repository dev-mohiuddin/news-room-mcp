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

/* ── Public — invitation acceptance ── */
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

/* ── Authenticated workspace endpoints ── */
teamRouter.use(protect);

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
