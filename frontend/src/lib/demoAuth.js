// Demo login profiles — these now hit the REAL backend /auth/login endpoint
// using the seeded credentials from initSuperAdmin.js.
//
// In dev or after backend seeds these accounts, demo cards work end-to-end:
//   click → POST /api/v1/auth/login → set cookies → redirect.

import { ROLES } from "./constants";

export const DEMO_ACCOUNTS = {
  admin: {
    role: ROLES.SUPER_ADMIN,
    label: "Super Admin",
    description: "Full platform control · plans, users, billing, content",
    email: "admin@newsroommcp.com",
    password: "Admin@12345",
    badge: "ADMIN",
    glow: "violet",
    accent: "from-violet-500 via-fuchsia-500 to-pink-500",
    iconKey: "shield",
    redirectTo: "/admin/dashboard",
  },
  user: {
    role: ROLES.WORKSPACE_OWNER,
    label: "Publisher",
    description: "Workspace owner · article generation, CMS, brand voice",
    email: "user@newsroommcp.com",
    password: "User@12345",
    badge: "USER",
    glow: "blue",
    accent: "from-blue-500 via-cyan-500 to-teal-500",
    iconKey: "sparkles",
    redirectTo: "/dashboard",
  },
};
