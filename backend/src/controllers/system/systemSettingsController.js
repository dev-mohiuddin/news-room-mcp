import { catchAsync } from "#utils/catchAsync.js";
import * as systemSettingsService from "#services/system/systemSettingsService.js";

/* GET /api/v1/settings/public  (no auth — used by landing/maintenance banner) */
export const getPublicSettings = catchAsync(async (_req, res) => {
  const data = await systemSettingsService.getPublicSettings();
  res.success({ data, message: "Public settings" });
});

/* GET /api/v1/admin/settings */
export const getAdminSettings = catchAsync(async (_req, res) => {
  const data = await systemSettingsService.getAdminSettings();
  res.success({ data, message: "Settings" });
});

/* PATCH /api/v1/admin/settings/:section */
export const patchSection = catchAsync(async (req, res) => {
  const data = await systemSettingsService.updateSettings({
    section: req.params.section,
    patch: req.body,
    actor: req.user,
    req,
  });
  res.success({ data, message: `${req.params.section} settings updated` });
});

/* PUT /api/v1/admin/settings/feature-flags */
export const replaceFeatureFlags = catchAsync(async (req, res) => {
  const data = await systemSettingsService.replaceFeatureFlags({
    flags: req.body.features,
    actor: req.user,
    req,
  });
  res.success({ data, message: "Feature flags updated" });
});

/* PATCH /api/v1/admin/settings/feature-flags/:flagId */
export const toggleFeatureFlag = catchAsync(async (req, res) => {
  const data = await systemSettingsService.toggleFeatureFlag({
    flagId: req.params.flagId,
    enabled: req.body.enabled,
    label: req.body.label,
    description: req.body.description,
    category: req.body.category,
    actor: req.user,
    req,
  });
  res.success({
    data,
    message: req.body.enabled
      ? `Feature '${req.params.flagId}' enabled`
      : `Feature '${req.params.flagId}' disabled`,
  });
});
