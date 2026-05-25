/**
 * ============================================================
 *  Newsroom MCP — Permission Helpers (Frontend)
 * ============================================================
 *
 * Mirrors the backend RBAC contract.
 *
 * USAGE
 *   import { hasPermission, hasRole, getRedirectFor } from "@/lib/permissions";
 *
 *   {hasPermission(user, "tenant.article:publish") && <PublishBtn />}
 *
 *   <Can perm="tenant.article:publish">  →  see components/shared/Can.jsx
 */

export const ROLE_SCOPES = {
  PLATFORM: "platform",
  TENANT: "tenant",
};

/**
 * Hardcoded role names — must mirror backend constants/roles.js
 * Used for role-name comparisons in nav guards / sidebars.
 */
export const ROLES = {
  // Platform
  SUPER_ADMIN: "super_admin",
  // Tenant (static)
  WORKSPACE_OWNER: "workspace_owner",
  EDITOR: "editor",
  WRITER: "writer",
  VIEWER: "viewer",
  // Backward-compat alias used in legacy mock data
  USER: "workspace_owner",
};

export const ROLE_REDIRECT_BY_SCOPE = {
  [ROLE_SCOPES.PLATFORM]: "/admin/dashboard",
  [ROLE_SCOPES.TENANT]: "/dashboard",
};

/* ──────────────────────────────────────────────────────────
 *  Permission catalog (mirror of backend)
 *  Drives the role create/edit picker UI in /admin/roles.
 * ────────────────────────────────────────────────────────── */
export const PERMISSIONS = {
  ALL: "*",

  // Platform
  PLATFORM_USER_READ: "platform.user:read",
  PLATFORM_USER_MANAGE: "platform.user:manage",
  PLATFORM_PLAN_MANAGE: "platform.plan:manage",
  PLATFORM_BILLING_READ: "platform.billing:read",
  PLATFORM_BILLING_MANAGE: "platform.billing:manage",
  PLATFORM_INTEGRATION_MANAGE: "platform.integration:manage",
  PLATFORM_CONTENT_MODERATE: "platform.content:moderate",
  PLATFORM_ANALYTICS_READ: "platform.analytics:read",
  PLATFORM_AUDIT_READ: "platform.audit:read",
  PLATFORM_BROADCAST_SEND: "platform.broadcast:send",
  PLATFORM_SETTINGS_MANAGE: "platform.settings:manage",
  PLATFORM_SUPPORT_MANAGE: "platform.support:manage",
  PLATFORM_ROLE_MANAGE: "platform.role:manage",

  // Tenant
  TENANT_ARTICLE_CREATE: "tenant.article:create",
  TENANT_ARTICLE_READ: "tenant.article:read",
  TENANT_ARTICLE_UPDATE: "tenant.article:update",
  TENANT_ARTICLE_DELETE: "tenant.article:delete",
  TENANT_ARTICLE_APPROVE: "tenant.article:approve",
  TENANT_ARTICLE_PUBLISH: "tenant.article:publish",
  TENANT_RESEARCH_USE: "tenant.research:use",
  TENANT_SEO_USE: "tenant.seo:use",
  TENANT_CMS_MANAGE: "tenant.cms:manage",
  TENANT_BRAND_MANAGE: "tenant.brand:manage",
  TENANT_TEMPLATE_MANAGE: "tenant.template:manage",
  TENANT_TEAM_MANAGE: "tenant.team:manage",
  TENANT_BILLING_READ: "tenant.billing:read",
  TENANT_BILLING_MANAGE: "tenant.billing:manage",
  TENANT_API_KEY_MANAGE: "tenant.apikey:manage",
  TENANT_WORKSPACE_MANAGE: "tenant.workspace:manage",
  TENANT_ANALYTICS_READ: "tenant.analytics:read",
};

/* ──────────────────────────────────────────────────────────
 *  Helpers
 * ────────────────────────────────────────────────────────── */

/**
 * Does the user have at least one of the required permissions?
 * Wildcard "*" passes everything.
 */
export const hasPermission = (user, required) => {
  if (!user || !Array.isArray(user.permissions)) return false;
  if (user.permissions.includes("*")) return true;

  const list = Array.isArray(required) ? required : [required];
  return list.some((p) => user.permissions.includes(p));
};

/**
 * Does the user have ALL of the required permissions?
 */
export const hasAllPermissions = (user, required) => {
  if (!user || !Array.isArray(user.permissions)) return false;
  if (user.permissions.includes("*")) return true;

  const list = Array.isArray(required) ? required : [required];
  return list.every((p) => user.permissions.includes(p));
};

/**
 * Does the user have one of the given roles?
 */
export const hasRole = (user, allowedRoles) => {
  if (!user?.role) return false;
  const list = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return list.includes(user.role);
};

/**
 * Is the user inside the given scope (platform vs tenant)?
 */
export const inScope = (user, scope) => user?.roleScope === scope;

/**
 * Compute redirect target for a logged-in user.
 *
 * Priority:
 *   1. Explicit redirectTo from backend payload (preferred)
 *   2. Role scope: platform → /admin/dashboard, tenant → /dashboard
 *   3. Specific role mapping (super_admin → admin)
 *   4. Default → /dashboard
 */
export const getRedirectFor = (user) => {
  if (!user) return "/dashboard";
  if (user.redirectTo) return user.redirectTo;
  if (user.roleScope && ROLE_REDIRECT_BY_SCOPE[user.roleScope]) {
    return ROLE_REDIRECT_BY_SCOPE[user.roleScope];
  }
  if (user.role === ROLES.SUPER_ADMIN) return "/admin/dashboard";
  return "/dashboard";
};
