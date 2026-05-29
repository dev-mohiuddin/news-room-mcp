// Route registry — same shape as amanaah_owner_frontend/src/routes/routes.jsx
// publicRoutes = no auth, privateRoutes = wrapped by IsLogin in App.jsx

import { Navigate } from "react-router-dom";
import {
  // Public
  LandingPage,
  NotFound,
  // Auth
  Login,
  Register,
  VerifyOtp,
  ForgotPassword,
  ResetPassword,
  AcceptInvite,
  GuestRoute,
  // Layouts (we mount layouts as element, then nest pages via children below)
  // Admin pages
  AdminDashboard,
  AdminUsers,
  AdminUserDetail,
  AdminPlans,
  AdminBilling,
  AdminIntegrations,
  AdminContentMonitor,
  AdminAnalytics,
  AdminNotifications,
  AdminSettings,
  AdminAuditLogs,
  AdminSupport,
  AdminRoles,
  // User pages
  UserDashboard,
  NewArticle,
  NewArticleEntry,
  Articles,
  ArticleDetail,
  Research,
  SEOTools,
  CMS,
  BrandVoice,
  Templates,
  UserAnalytics,
  Team,
  APIKeys,
  UserBilling,
  UserSettings,
  UserSupport,
} from "@/pages";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import UserLayout from "@/layouts/UserLayout";
import { ROLES } from "@/lib/constants";

/**
 * Public routes — accessible to everyone.
 * Auth pages are wrapped in <GuestRoute /> to bounce logged-in users away.
 */
export const publicRoutes = [
  { path: "/", element: <LandingPage /> },
  { path: "*", element: <NotFound /> },

  {
    path: "/auth/login",
    element: (
      <GuestRoute>
        <Login />
      </GuestRoute>
    ),
  },
  {
    path: "/auth/register",
    element: (
      <GuestRoute>
        <Register />
      </GuestRoute>
    ),
  },
  {
    path: "/auth/verify-otp",
    element: (
      <GuestRoute>
        <VerifyOtp />
      </GuestRoute>
    ),
  },
  {
    path: "/auth/forgot-password",
    element: (
      <GuestRoute>
        <ForgotPassword />
      </GuestRoute>
    ),
  },
  {
    path: "/auth/reset-password/:token",
    element: (
      <GuestRoute>
        <ResetPassword />
      </GuestRoute>
    ),
  },
  {
    path: "/auth/accept-invite/:token",
    element: <AcceptInvite />, // works for both authed + guest
  },
];

/**
 * Private routes — wrapped by <IsLogin /> in App.jsx.
 *
 * Each entry has an optional `roles` array — App.jsx will additionally enforce
 * RoleGuard for routes that declare it. Two top-level layouts:
 *  - /admin/*    → SuperAdminLayout  (SUPER_ADMIN only)
 *  - /dashboard/* → UserLayout       (USER + SUPER_ADMIN allowed)
 */
export const privateRoutes = [
  // ── Super Admin panel ────────────────────────────────────────────────
  {
    path: "/admin",
    element: <SuperAdminLayout />,
    roles: [ROLES.SUPER_ADMIN],
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "users", element: <AdminUsers /> },
      { path: "users/:id", element: <AdminUserDetail /> },
      { path: "plans", element: <AdminPlans /> },
      { path: "billing", element: <AdminBilling /> },
      { path: "integrations", element: <AdminIntegrations /> },
      { path: "content", element: <AdminContentMonitor /> },
      { path: "analytics", element: <AdminAnalytics /> },
      { path: "notifications", element: <AdminNotifications /> },
      { path: "settings", element: <AdminSettings /> },
      { path: "logs", element: <AdminAuditLogs /> },
      { path: "support", element: <AdminSupport /> },
      { path: "roles", element: <AdminRoles /> },
    ],
  },

  // ── User panel ───────────────────────────────────────────────────────
  {
    path: "/dashboard",
    element: <UserLayout />,
    // Any tenant role can enter the user panel — page-level permission
    // gates handle finer-grained access.
    roles: [
      ROLES.WORKSPACE_OWNER,
      ROLES.EDITOR,
      ROLES.WRITER,
      ROLES.VIEWER,
      ROLES.SUPER_ADMIN, // super_admin can preview tenant flow
    ],
    children: [
      { index: true, element: <UserDashboard /> },
      { path: "new-article", element: <NewArticleEntry /> },
      { path: "new-article/:articleId", element: <NewArticleEntry /> },
      { path: "articles", element: <Articles /> },
      { path: "articles/:id", element: <ArticleDetail /> },
      { path: "research", element: <Research /> },
      { path: "seo", element: <SEOTools /> },
      { path: "cms", element: <CMS /> },
      { path: "brand-voice", element: <BrandVoice /> },
      { path: "templates", element: <Templates /> },
      { path: "analytics", element: <UserAnalytics /> },
      { path: "team", element: <Team /> },
      { path: "api-keys", element: <APIKeys /> },
      { path: "billing", element: <UserBilling /> },
      { path: "settings", element: <UserSettings /> },
      { path: "support", element: <UserSupport /> },
    ],
  },
];
