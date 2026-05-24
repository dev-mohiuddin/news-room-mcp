// Demo login profiles — wired for showcase / dev environment.
// Click a card on the auth page → instant login bypassing the API.
import { ROLES } from "./constants";

export const DEMO_ACCOUNTS = {
  admin: {
    role: ROLES.SUPER_ADMIN,
    label: "Super Admin",
    description: "Full platform control · plans, users, billing, content",
    email: "admin@newsroommcp.com",
    password: "demo-admin-2026",
    badge: "ADMIN",
    glow: "violet",
    accent: "from-violet-500 via-fuchsia-500 to-pink-500",
    iconKey: "shield",
    redirectTo: "/admin/dashboard",
    user: {
      id: "demo-admin",
      name: "Alex Morgan",
      email: "admin@newsroommcp.com",
      role: ROLES.SUPER_ADMIN,
      avatar: null,
    },
  },
  user: {
    role: ROLES.USER,
    label: "Publisher",
    description: "Workspace owner · article generation, CMS, brand voice",
    email: "user@newsroommcp.com",
    password: "demo-user-2026",
    badge: "USER",
    glow: "blue",
    accent: "from-blue-500 via-cyan-500 to-teal-500",
    iconKey: "sparkles",
    redirectTo: "/dashboard",
    user: {
      id: "demo-user",
      name: "Sarah Chen",
      email: "user@newsroommcp.com",
      role: ROLES.USER,
      avatar: null,
      plan: "pro",
    },
  },
};

/**
 * Persists the demo user into localStorage to mirror the real login flow.
 * Returns the user object so callers can dispatch it into Redux.
 */
export function persistDemoLogin(profileKey) {
  const profile = DEMO_ACCOUNTS[profileKey];
  if (!profile) return null;
  const token = `demo-token-${profileKey}-${Date.now()}`;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(profile.user));
  return { user: profile.user, token, redirectTo: profile.redirectTo };
}
