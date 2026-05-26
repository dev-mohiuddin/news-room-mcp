import { ROLE_SCOPES } from "#constants/roles.js";

/**
 * ============================================================
 *  Tenant Scope Middleware — Requirement 15
 * ============================================================
 *
 *  Run AFTER `protect` (which populates req.user) and BEFORE
 *  `requirePermission` on every tenant route group:
 *      /api/v1/articles
 *      /api/v1/research
 *      /api/v1/cms
 *      /api/v1/seo
 *      /api/v1/quota
 *      /api/v1/team   (already enforced inside the team service)
 *
 *  Sets `req.tenant.workspaceId` from the authenticated user's workspaceId.
 *  Refuses platform-scope users with no workspace.
 */

export const tenantScope = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.error({
      message: "Authentication required",
      statusCode: 401,
    });
  }

  // Platform admins (super_admin etc.) typically have no workspaceId.
  // They should NOT be able to access tenant routes.
  if (!user.workspaceId) {
    return res.error({
      message:
        "This endpoint is workspace-scoped. Switch to a tenant account to continue.",
      statusCode: 403,
      data: { code: "TENANT_SCOPE_REQUIRED" },
    });
  }

  // Optional sanity: if user is platform-scoped AND somehow has a workspaceId,
  // we still allow it (super_admin previewing tenant flow), but flag it.
  req.tenant = {
    workspaceId: user.workspaceId,
    userId: user.id,
    role: user.role,
    roleScope: user.roleScope || ROLE_SCOPES.TENANT,
  };

  next();
};

export default tenantScope;
