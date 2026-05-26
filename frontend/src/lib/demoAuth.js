// Demo login profiles — these hit the REAL backend /api/v1/auth/login
// using the credentials seeded by initSuperAdmin.js.
//
// The "owner" demo is the workspace_owner role which holds EVERY
// tenant permission (article create/update/publish, team manage,
// CMS manage, brand voice, billing, settings — everything).
// Pair it with the super_admin demo to showcase both panels.

import { ROLES } from "./constants";

export const DEMO_ACCOUNTS = {
  admin: {
    role: ROLES.SUPER_ADMIN,
    label: "Super Admin",
    description: "Full platform control · plans, users, billing, audit logs",
    email: "admin@newsroommcp.com",
    password: "Admin@12345",
    badge: "ADMIN",
    glow: "violet",
    accent: "from-violet-500 via-fuchsia-500 to-pink-500",
    iconKey: "shield",
    redirectTo: "/admin/dashboard",
  },
  owner: {
    role: ROLES.WORKSPACE_OWNER,
    label: "Workspace Owner",
    description: "All tenant permissions · articles, team, billing, CMS, brand voice",
    email: "user@newsroommcp.com",
    password: "User@12345",
    badge: "OWNER",
    glow: "blue",
    accent: "from-blue-500 via-cyan-500 to-teal-500",
    iconKey: "crown",
    redirectTo: "/dashboard",
  },
};
