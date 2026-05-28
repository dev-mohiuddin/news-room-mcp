import * as integrationService from "#services/system/integrationService.js";
import { testIntegration } from "#services/system/integrationTestService.js";
import { catchAsync } from "#utils/catchAsync.js";

/* GET /api/v1/admin/integrations */
export const listIntegrationsHandler = catchAsync(async (_req, res) => {
  const data = await integrationService.listIntegrationsForAdmin();
  res.success({ data, message: "Integrations" });
});

/* PUT /api/v1/admin/integrations
 * body: { provider, bundle: { ... }, label?, isActive? }
 */
export const upsertIntegrationHandler = catchAsync(async (req, res) => {
  const data = await integrationService.upsertIntegration({
    provider: req.body.provider,
    bundle: req.body.bundle,
    label: req.body.label,
    isActive: req.body.isActive,
    userId: req.user.id,
    req,
  });
  res.success({ data, message: "Integration saved" });
});

/* PATCH /api/v1/admin/integrations/:provider/active */
export const setIntegrationActiveHandler = catchAsync(async (req, res) => {
  const data = await integrationService.setIntegrationActive({
    provider: req.params.provider,
    isActive: req.body.isActive,
    userId: req.user.id,
    req,
  });
  res.success({ data, message: data.isActive ? "Enabled" : "Disabled" });
});

/* DELETE /api/v1/admin/integrations/:provider */
export const deleteIntegrationHandler = catchAsync(async (req, res) => {
  const data = await integrationService.deleteIntegration({
    provider: req.params.provider,
    userId: req.user.id,
    req,
  });
  res.success({ data, message: "Integration disconnected" });
});

/* POST /api/v1/admin/integrations/:provider/test
 *
 *   - Always responds 200 with `{ ok, error, integration }`. The
 *     admin UI inspects `ok` to render success/error toast.
 *   - Failures DO NOT bubble — they are recorded on the doc.
 */
export const testIntegrationHandler = catchAsync(async (req, res) => {
  const result = await testIntegration(req.params.provider);
  res.success({
    data: {
      ok: result.ok,
      error: result.error,
      integration: result.record,
    },
    message: result.ok ? "Connection OK" : "Connection failed",
  });
});
