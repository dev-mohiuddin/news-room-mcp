import * as teamService from "#services/team/teamService.js";
import { catchAsync } from "#utils/catchAsync.js";

/* GET /api/v1/team */
export const listTeam = catchAsync(async (req, res) => {
  const { members, invites } = await teamService.listTeam(req.user);
  res.success({
    data: { members, invites },
    message: "Team fetched",
  });
});

/* POST /api/v1/team/invitations */
export const inviteMember = catchAsync(async (req, res) => {
  const result = await teamService.inviteMember({
    actor: req.user,
    email: req.body.email,
    roleName: req.body.roleName,
    req,
  });
  res.success({
    data: result,
    message: `Invitation sent to ${req.body.email}`,
    statusCode: 201,
  });
});

/* POST /api/v1/team/invitations/:id/resend */
export const resendInvite = catchAsync(async (req, res) => {
  const result = await teamService.resendInvite({
    actor: req.user,
    inviteId: req.params.id,
    req,
  });
  res.success({ data: result, message: "Invitation resent" });
});

/* DELETE /api/v1/team/invitations/:id */
export const cancelInvite = catchAsync(async (req, res) => {
  await teamService.cancelInvite({
    actor: req.user,
    inviteId: req.params.id,
    req,
  });
  res.success({ data: null, message: "Invitation cancelled" });
});

/* PATCH /api/v1/team/members/:id/role */
export const changeMemberRole = catchAsync(async (req, res) => {
  const member = await teamService.changeMemberRole({
    actor: req.user,
    memberId: req.params.id,
    roleName: req.body.roleName,
    req,
  });
  res.success({ data: member, message: "Role updated" });
});

/* DELETE /api/v1/team/members/:id */
export const removeMember = catchAsync(async (req, res) => {
  await teamService.removeMember({
    actor: req.user,
    memberId: req.params.id,
    req,
  });
  res.success({ data: null, message: "Member removed" });
});

/* GET /api/v1/auth/invitations/:token  (public — pre-fill accept page) */
export const inspectInvite = catchAsync(async (req, res) => {
  const data = await teamService.inspectInvite(req.params.token);
  res.success({ data, message: "Invitation details" });
});

/* POST /api/v1/auth/invitations/:token/accept  (public) */
export const acceptInvite = catchAsync(async (req, res) => {
  const { user, workspace } = await teamService.acceptInvite({
    token: req.params.token,
    name: req.body.name,
    password: req.body.password,
  });
  res.success({
    data: { user, workspace },
    message: "Invitation accepted. You can sign in now.",
    statusCode: 201,
  });
});
