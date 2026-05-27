import * as planService from "#services/billing/planService.js";
import { catchAsync } from "#utils/catchAsync.js";
import { parsePaginationParams } from "#utils/paginationUtil.js";

/* ─────────────────────────────────────────────────────────────
 *  Public — landing/pricing page (no auth required)
 * ───────────────────────────────────────────────────────────── */

/* GET /api/v1/plans */
export const listPublicPlans = catchAsync(async (_req, res) => {
  const items = await planService.listPublicPlans();
  res.success({ data: items, message: "Plans" });
});

/* ─────────────────────────────────────────────────────────────
 *  Admin — full CRUD (super admin / platform.plan:manage)
 * ───────────────────────────────────────────────────────────── */

/* GET /api/v1/admin/plans */
export const listAdminPlans = catchAsync(async (req, res) => {
  // If pagination params are passed → paginated response, else full list
  const hasPagingParams = "page" in req.query || "perPage" in req.query || "search" in req.query;

  if (!hasPagingParams) {
    const items = await planService.listForAdmin();
    return res.success({ data: items, message: "Plans" });
  }

  const params = parsePaginationParams(req, {
    defaultSortBy: "sortOrder",
    defaultSortOrder: "asc",
    allowedSortFields: ["sortOrder", "monthlyPriceCents", "displayName", "createdAt"],
  });
  const filters = {};
  if (req.query.isActive !== undefined) {
    filters.isActive =
      req.query.isActive === true || req.query.isActive === "true";
  }
  const { items, meta } = await planService.listForAdminPaginated(params, filters);
  res.success({ data: items, pagination: meta, message: "Plans" });
});

/* GET /api/v1/admin/plans/:id */
export const getAdminPlan = catchAsync(async (req, res) => {
  const plan = await planService.getPlan(req.params.id);
  res.success({ data: plan, message: "Plan" });
});

/* POST /api/v1/admin/plans */
export const createAdminPlan = catchAsync(async (req, res) => {
  const plan = await planService.createPlan({
    actor: req.user,
    input: req.body,
    req,
  });
  res.success({
    statusCode: 201,
    data: plan,
    message: `Plan '${plan.displayName}' created`,
  });
});

/* PATCH /api/v1/admin/plans/:id */
export const updateAdminPlan = catchAsync(async (req, res) => {
  const plan = await planService.updatePlan({
    id: req.params.id,
    actor: req.user,
    input: req.body,
    req,
  });
  res.success({ data: plan, message: `Plan '${plan.displayName}' updated` });
});

/* PATCH /api/v1/admin/plans/:id/active */
export const toggleAdminPlanActive = catchAsync(async (req, res) => {
  const plan = await planService.setPlanActive({
    id: req.params.id,
    actor: req.user,
    isActive: !!req.body.isActive,
    req,
  });
  res.success({
    data: plan,
    message: plan.isActive ? "Plan activated" : "Plan deactivated",
  });
});

/* DELETE /api/v1/admin/plans/:id */
export const deleteAdminPlan = catchAsync(async (req, res) => {
  await planService.deletePlan({
    id: req.params.id,
    actor: req.user,
    req,
  });
  res.status(204).end();
});
