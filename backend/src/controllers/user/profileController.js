import * as profileService from "#services/user/profileService.js";
import { catchAsync } from "#utils/catchAsync.js";

/* GET /api/v1/user/me */
export const getMyProfileHandler = catchAsync(async (req, res) => {
  const data = await profileService.getMyProfile({
    userId: req.user.id,
    workspaceId: req.tenant.workspaceId,
  });
  res.success({ data, message: "Profile" });
});

/* PATCH /api/v1/user/profile */
export const updateMyProfileHandler = catchAsync(async (req, res) => {
  const data = await profileService.updateMyProfile({
    userId: req.user.id,
    payload: req.body,
    req,
  });
  res.success({ data, message: "Profile updated" });
});

/* PUT /api/v1/user/password */
export const changeMyPasswordHandler = catchAsync(async (req, res) => {
  await profileService.changeMyPassword({
    userId: req.user.id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    req,
  });
  res.success({ data: null, message: "Password changed" });
});

/* PATCH /api/v1/user/notifications */
export const updateMyNotificationsHandler = catchAsync(async (req, res) => {
  const data = await profileService.updateMyNotificationPrefs({
    userId: req.user.id,
    payload: req.body,
    req,
  });
  res.success({ data, message: "Notification preferences updated" });
});

/* PATCH /api/v1/user/workspace */
export const updateMyWorkspaceHandler = catchAsync(async (req, res) => {
  const data = await profileService.updateMyWorkspace({
    userId: req.user.id,
    workspaceId: req.tenant.workspaceId,
    payload: req.body,
    req,
  });
  res.success({ data, message: "Workspace updated" });
});
