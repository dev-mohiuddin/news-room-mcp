// Role + permission constants for Newsroom MCP.
// Two-panel SaaS — Super Admin (platform owner) + User (tenant publisher).

export const ROLE_NAMES = {
  SUPER_ADMIN: "SuperAdmin",
  USER: "User",
};

export const PERMISSIONS = {
  // Wildcard
  ALL: "*",

  // Platform-level (Super Admin)
  PLATFORM_USER_READ: "platform.user:read",
  PLATFORM_USER_MANAGE: "platform.user:manage",
  PLATFORM_PLAN_MANAGE: "platform.plan:manage",
  PLATFORM_BILLING_READ: "platform.billing:read",
  PLATFORM_INTEGRATION_MANAGE: "platform.integration:manage",
  PLATFORM_CONTENT_MODERATE: "platform.content:moderate",
  PLATFORM_ANALYTICS_READ: "platform.analytics:read",
  PLATFORM_AUDIT_READ: "platform.audit:read",
  PLATFORM_BROADCAST_SEND: "platform.broadcast:send",
  PLATFORM_SETTINGS_MANAGE: "platform.settings:manage",
  PLATFORM_SUPPORT_MANAGE: "platform.support:manage",

  // Tenant-level (User)
  TENANT_ARTICLE_CREATE: "tenant.article:create",
  TENANT_ARTICLE_READ: "tenant.article:read",
  TENANT_ARTICLE_UPDATE: "tenant.article:update",
  TENANT_ARTICLE_DELETE: "tenant.article:delete",
  TENANT_ARTICLE_PUBLISH: "tenant.article:publish",
  TENANT_RESEARCH_USE: "tenant.research:use",
  TENANT_SEO_USE: "tenant.seo:use",
  TENANT_CMS_MANAGE: "tenant.cms:manage",
  TENANT_BRAND_MANAGE: "tenant.brand:manage",
  TENANT_TEMPLATE_MANAGE: "tenant.template:manage",
  TENANT_TEAM_MANAGE: "tenant.team:manage",
  TENANT_BILLING_READ: "tenant.billing:read",
  TENANT_API_KEY_MANAGE: "tenant.apikey:manage",
};

const ALL_TENANT_PERMISSIONS = [
  PERMISSIONS.TENANT_ARTICLE_CREATE,
  PERMISSIONS.TENANT_ARTICLE_READ,
  PERMISSIONS.TENANT_ARTICLE_UPDATE,
  PERMISSIONS.TENANT_ARTICLE_DELETE,
  PERMISSIONS.TENANT_ARTICLE_PUBLISH,
  PERMISSIONS.TENANT_RESEARCH_USE,
  PERMISSIONS.TENANT_SEO_USE,
  PERMISSIONS.TENANT_CMS_MANAGE,
  PERMISSIONS.TENANT_BRAND_MANAGE,
  PERMISSIONS.TENANT_TEMPLATE_MANAGE,
  PERMISSIONS.TENANT_TEAM_MANAGE,
  PERMISSIONS.TENANT_BILLING_READ,
  PERMISSIONS.TENANT_API_KEY_MANAGE,
];

export const PLATFORM_ROLES = [
  {
    name: ROLE_NAMES.SUPER_ADMIN,
    description:
      "Full platform control — users, plans, billing, content moderation, system settings.",
    permissions: [PERMISSIONS.ALL],
    hierarchy: 1,
    isDefault: false,
  },
  {
    name: ROLE_NAMES.USER,
    description:
      "Tenant workspace owner — full access to their own articles, CMS, brand voice, team.",
    permissions: ALL_TENANT_PERMISSIONS,
    hierarchy: 2,
    isDefault: true,
  },
];
