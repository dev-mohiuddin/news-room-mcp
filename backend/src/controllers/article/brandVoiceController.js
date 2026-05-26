import { catchAsync } from "#utils/catchAsync.js";
import { throwError } from "#utils/throwErrorUtil.js";
import {
  listProfiles,
  findProfileById,
  deleteProfile,
  setActiveProfile,
} from "#repositories/brandVoiceRepository.js";
import {
  seedAndExtract,
  extractAndSaveVoiceProfile,
} from "#services/article/brandVoiceService.js";

const MIN_SAMPLES = 3;
const MAX_SAMPLES = 5;

/* GET /api/v1/brand-voice */
export const listProfilesHandler = catchAsync(async (req, res) => {
  const items = await listProfiles(req.tenant.workspaceId);
  res.success({ data: items, message: "Brand voice profiles" });
});

/* GET /api/v1/brand-voice/:id */
export const getProfileHandler = catchAsync(async (req, res) => {
  const profile = await findProfileById(
    req.tenant.workspaceId,
    req.params.id
  );
  if (!profile) throwError("Profile not found", 404);
  res.success({ data: profile, message: "Brand voice profile" });
});

/* POST /api/v1/brand-voice
 *
 * body: { name, description?, samples: [{ title?, text }] }
 * Triggers Haiku extraction synchronously and persists the profile.
 */
export const createProfileHandler = catchAsync(async (req, res) => {
  const { name, description, samples } = req.body || {};
  if (!name?.trim()) throwError("name is required", 400);
  if (!Array.isArray(samples) || samples.length < MIN_SAMPLES) {
    throwError(`At least ${MIN_SAMPLES} samples are required`, 400);
  }
  if (samples.length > MAX_SAMPLES) {
    throwError(`At most ${MAX_SAMPLES} samples allowed`, 400);
  }
  for (const s of samples) {
    if (!s?.text || s.text.length < 200) {
      throwError("Each sample must contain at least 200 characters", 400);
    }
  }

  const profile = await seedAndExtract({
    workspaceId: req.tenant.workspaceId,
    userId: req.tenant.userId,
    name: name.trim(),
    description,
    samples,
  });
  res.success({
    data: profile,
    message: "Brand voice profile created",
    statusCode: 201,
  });
});

/* POST /api/v1/brand-voice/:id/re-extract */
export const reExtractHandler = catchAsync(async (req, res) => {
  const profile = await extractAndSaveVoiceProfile({
    workspaceId: req.tenant.workspaceId,
    profileId: req.params.id,
  });
  res.success({ data: profile, message: "Brand voice re-extracted" });
});

/* POST /api/v1/brand-voice/:id/activate */
export const activateProfileHandler = catchAsync(async (req, res) => {
  const profile = await setActiveProfile(
    req.tenant.workspaceId,
    req.params.id
  );
  if (!profile) throwError("Profile not found", 404);
  res.success({ data: profile, message: "Brand voice activated" });
});

/* DELETE /api/v1/brand-voice/:id */
export const deleteProfileHandler = catchAsync(async (req, res) => {
  const removed = await deleteProfile(req.tenant.workspaceId, req.params.id);
  if (!removed) throwError("Profile not found", 404);
  res.status(204).end();
});
