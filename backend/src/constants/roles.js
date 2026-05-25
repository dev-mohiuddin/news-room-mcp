/**
 * ============================================================
 *  Newsroom MCP — RBAC Constants
 * ============================================================
 *
 * Hybrid model:
 *  - PLATFORM SIDE  → DYNAMIC. Only `super_admin` is seeded; admins
 *                     create custom roles (e.g. finance_manager,
 *                     content_moderator) via the /admin/roles UI,
 *                     picking permissions from PLATFORM_PERMISSIONS.
 *  - TENANT SIDE   → STATIC. Four hardcoded roles seeded once;
 *                     never editable from UI. Permissions controlled
 *                     by code (this file). To change → modify here
 *                     and re-deploy.
 *
 * Permission format: `<scope>.<resource>:<action>`
 *  - scope    = "platform" | "tenant"
 *  - resource = "user" | "article" | ...
 *  - action   = "read" | "manage" | "publish" | ...
 *
 * Wildcard "*" passes every permission check (super_admin only).
 */

export const ROLE_SCOPES = {
  PLATFORM: "platform",
  TENANT: "tenant",
};

export const ROLE_NAMES = {
  // Platform — only super_admin is seeded; rest are user-created
  SUPER_ADMIN: "super_admin",

  // Tenant — all four are seeded and locked
  WORKSPACE_OWNER: "workspace_owner",
  EDITOR: "editor",
  WRITER: "writer",
  VIEWER: "viewer",
};

/* ──────────────────────────────────────────────────────────
 *  Permission catalog
 *  Drives the permission picker UI and runtime enforcement.
 * ────────────────────────────────────────────────────────── */

export const PERMISSIONS = {
  ALL: "*",

  /* ── Platform (used in dynamic platform roles) ── */
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
  PLATFORM_ROLE_MANAGE: "platform.role:manage", // grant only to super_admin

  /* ── Tenant (used in static tenant roles) ── */
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

/**
 * Grouped catalog for the UI permission picker.
 * Each group becomes a section (e.g. "Users", "Billing") with checkboxes.
 */
export const PERMISSION_CATALOG = {
  platform: [
    {
      group: "Users",
      items: [
        { key: PERMISSIONS.PLATFORM_USER_READ, label: "View users" },
        { key: PERMISSIONS.PLATFORM_USER_MANAGE, label: "Manage users (suspend, change role, delete)" },
      ],
    },
    {
      group: "Plans & Billing",
      items: [
        { key: PERMISSIONS.PLATFORM_PLAN_MANAGE, label: "Manage subscription plans" },
        { key: PERMISSIONS.PLATFORM_BILLING_READ, label: "View revenue & transactions" },
        { key: PERMISSIONS.PLATFORM_BILLING_MANAGE, label: "Issue refunds & manual overrides" },
      ],
    },
    {
      group: "Content",
      items: [
        { key: PERMISSIONS.PLATFORM_CONTENT_MODERATE, label: "Moderate content (flag/takedown)" },
        { key: PERMISSIONS.PLATFORM_INTEGRATION_MANAGE, label: "Manage CMS integrations" },
      ],
    },
    {
      group: "Insights",
      items: [
        { key: PERMISSIONS.PLATFORM_ANALYTICS_READ, label: "View platform analytics" },
        { key: PERMISSIONS.PLATFORM_AUDIT_READ, label: "View audit logs" },
      ],
    },
    {
      group: "Communications",
      items: [
        { key: PERMISSIONS.PLATFORM_BROADCAST_SEND, label: "Send broadcast notifications" },
        { key: PERMISSIONS.PLATFORM_SUPPORT_MANAGE, label: "Reply to support tickets" },
      ],
    },
    {
      group: "System",
      items: [
        { key: PERMISSIONS.PLATFORM_SETTINGS_MANAGE, label: "Manage platform settings" },
        {
          key: PERMISSIONS.PLATFORM_ROLE_MANAGE,
          label: "Manage roles & permissions",
          superAdminOnly: true,
        },
      ],
    },
  ],
  tenant: [
    {
      group: "Articles",
      items: [
        { key: PERMISSIONS.TENANT_ARTICLE_CREATE, label: "Create articles" },
        { key: PERMISSIONS.TENANT_ARTICLE_READ, label: "View articles" },
        { key: PERMISSIONS.TENANT_ARTICLE_UPDATE, label: "Edit articles" },
        { key: PERMISSIONS.TENANT_ARTICLE_DELETE, label: "Delete articles" },
        { key: PERMISSIONS.TENANT_ARTICLE_APPROVE, label: "Approve articles" },
        { key: PERMISSIONS.TENANT_ARTICLE_PUBLISH, label: "Publish to CMS" },
      ],
    },
    {
      group: "Tools",
      items: [
        { key: PERMISSIONS.TENANT_RESEARCH_USE, label: "Use research tool" },
        { key: PERMISSIONS.TENANT_SEO_USE, label: "Use SEO tools" },
      ],
    },
    {
      group: "Workspace assets",
      items: [
        { key: PERMISSIONS.TENANT_BRAND_MANAGE, label: "Manage brand voice" },
        { key: PERMISSIONS.TENANT_TEMPLATE_MANAGE, label: "Manage templates" },
        { key: PERMISSIONS.TENANT_CMS_MANAGE, label: "Manage CMS connections" },
        { key: PERMISSIONS.TENANT_API_KEY_MANAGE, label: "Manage API keys" },
      ],
    },
    {
      group: "Team & billing",
      items: [
        { key: PERMISSIONS.TENANT_TEAM_MANAGE, label: "Invite & manage teammates" },
        { key: PERMISSIONS.TENANT_BILLING_READ, label: "View billing" },
        { key: PERMISSIONS.TENANT_BILLING_MANAGE, label: "Change plan & payment method" },
        { key: PERMISSIONS.TENANT_WORKSPACE_MANAGE, label: "Manage workspace settings" },
        { key: PERMISSIONS.TENANT_ANALYTICS_READ, label: "View workspace analytics" },
      ],
    },
  ],
};

/**
 * Flat lists of permissions used to build static tenant roles.
 */
const ALL_TENANT_PERMISSIONS = PERMISSION_CATALOG.tenant.flatMap((g) =>
  g.items.map((i) => i.key)
);

const EDITOR_PERMISSIONS = [
  PERMISSIONS.TENANT_ARTICLE_CREATE,
  PERMISSIONS.TENANT_ARTICLE_READ,
  PERMISSIONS.TENANT_ARTICLE_UPDATE,
  PERMISSIONS.TENANT_ARTICLE_DELETE,
  PERMISSIONS.TENANT_ARTICLE_APPROVE,
  PERMISSIONS.TENANT_ARTICLE_PUBLISH,
  PERMISSIONS.TENANT_RESEARCH_USE,
  PERMISSIONS.TENANT_SEO_USE,
  PERMISSIONS.TENANT_BRAND_MANAGE,
  PERMISSIONS.TENANT_TEMPLATE_MANAGE,
  PERMISSIONS.TENANT_ANALYTICS_READ,
];

const WRITER_PERMISSIONS = [
  PERMISSIONS.TENANT_ARTICLE_CREATE,
  PERMISSIONS.TENANT_ARTICLE_READ,
  PERMISSIONS.TENANT_ARTICLE_UPDATE, // own only — enforced by ownership check
  PERMISSIONS.TENANT_ARTICLE_DELETE, // own only
  PERMISSIONS.TENANT_RESEARCH_USE,
  PERMISSIONS.TENANT_SEO_USE,
];

const VIEWER_PERMISSIONS = [
  PERMISSIONS.TENANT_ARTICLE_READ,
  PERMISSIONS.TENANT_ANALYTICS_READ,
];

/* ──────────────────────────────────────────────────────────
 *  Role Redirect map
 * ────────────────────────────────────────────────────────── */
export const ROLE_REDIRECT_BY_SCOPE = {
  [ROLE_SCOPES.PLATFORM]: "/admin/dashboard",
  [ROLE_SCOPES.TENANT]: "/dashboard",
};

/* ──────────────────────────────────────────────────────────
 *  Seeded roles
 *
 *  Platform → only super_admin (admins create the rest)
 *  Tenant   → all four static roles
 * ────────────────────────────────────────────────────────── */

export const SEEDED_ROLES = [
  /* ── Platform (only one) ── */
  {
    name: ROLE_NAMES.SUPER_ADMIN,
    displayName: "Super Admin",
    description: "Platform owner — full unrestricted control.",
    scope: ROLE_SCOPES.PLATFORM,
    permissions: [PERMISSIONS.ALL],
    isSystem: true,   // cannot be deleted
    isStatic: true,   // cannot be edited
    isDefault: false,
  },

  /* ── Tenant (all four, static) ── */
  {
    name: ROLE_NAMES.WORKSPACE_OWNER,
    displayName: "Owner",
    description: "Full control over the workspace — billing, team, content.",
    scope: ROLE_SCOPES.TENANT,
    permissions: ALL_TENANT_PERMISSIONS,
    isSystem: true,
    isStatic: true,
    isDefault: true,  // assigned on signup
  },
  {
    name: ROLE_NAMES.EDITOR,
    displayName: "Editor",
    description: "Reviews, approves, and publishes articles. Manages brand & templates.",
    scope: ROLE_SCOPES.TENANT,
    permissions: EDITOR_PERMISSIONS,
    isSystem: true,
    isStatic: true,
    isDefault: false,
  },
  {
    name: ROLE_NAMES.WRITER,
    displayName: "Writer",
    description: "Creates articles and uses research/SEO tools. Limited to own work.",
    scope: ROLE_SCOPES.TENANT,
    permissions: WRITER_PERMISSIONS,
    isSystem: true,
    isStatic: true,
    isDefault: false,
  },
  {
    name: ROLE_NAMES.VIEWER,
    displayName: "Viewer",
    description: "Read-only access to articles and analytics.",
    scope: ROLE_SCOPES.TENANT,
    permissions: VIEWER_PERMISSIONS,
    isSystem: true,
    isStatic: true,
    isDefault: false,
  },
];

/* ──────────────────────────────────────────────────────────
 *  Helpers
 * ────────────────────────────────────────────────────────── */

export const isPlatformRole = (role) => role?.scope === ROLE_SCOPES.PLATFORM;
export const isTenantRole = (role) => role?.scope === ROLE_SCOPES.TENANT;

/**
 * Compute redirect URL for a user given their role.
 */
export const computeRedirect = (role) => {
  if (!role?.scope) return "/dashboard";
  return ROLE_REDIRECT_BY_SCOPE[role.scope] || "/dashboard";
};

/**
 * All valid permission strings (for validation).
 */
export const ALL_PERMISSION_KEYS = [
  PERMISSIONS.ALL,
  ...PERMISSION_CATALOG.platform.flatMap((g) => g.items.map((i) => i.key)),
  ...PERMISSION_CATALOG.tenant.flatMap((g) => g.items.map((i) => i.key)),
];

/**
 * Backward-compat exports (older code may still import these).
 */
export const ROLE_REDIRECT = {
  [ROLE_NAMES.SUPER_ADMIN]: "/admin/dashboard",
  [ROLE_NAMES.WORKSPACE_OWNER]: "/dashboard",
  [ROLE_NAMES.EDITOR]: "/dashboard",
  [ROLE_NAMES.WRITER]: "/dashboard",
  [ROLE_NAMES.VIEWER]: "/dashboard",
};
export const PLATFORM_ROLES = SEEDED_ROLES; // alias
