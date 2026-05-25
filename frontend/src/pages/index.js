// Central pages export — same pattern as amanaah_owner_frontend/src/pages/index.js

// Public
import LandingPage from "./public/landing";
import RootPage from "./root";
import NotFound from "./utils/not-found";

// Auth
import Login from "./auth/login";
import Register from "./auth/register";
import VerifyOtp from "./auth/verify-otp";
import ForgotPassword from "./auth/forgot-password";
import ResetPassword from "./auth/reset-password";
import AcceptInvite from "./auth/accept-invite";
import { IsLogin, RoleGuard, GuestRoute } from "./auth/check-auth";

// Super Admin
import AdminDashboard from "./admin/dashboard";
import AdminUsers from "./admin/users";
import AdminUserDetail from "./admin/user-detail";
import AdminPlans from "./admin/plans";
import AdminBilling from "./admin/billing";
import AdminIntegrations from "./admin/integrations";
import AdminContentMonitor from "./admin/content-monitor";
import AdminAnalytics from "./admin/analytics";
import AdminNotifications from "./admin/notifications";
import AdminSettings from "./admin/settings";
import AdminAuditLogs from "./admin/audit-logs";
import AdminSupport from "./admin/support";
import AdminRoles from "./admin/roles";

// User
import UserDashboard from "./user/dashboard";
import NewArticle from "./user/new-article";
import Articles from "./user/articles";
import ArticleDetail from "./user/article-detail";
import Research from "./user/research";
import SEOTools from "./user/seo-tools";
import CMS from "./user/cms";
import BrandVoice from "./user/brand-voice";
import Templates from "./user/templates";
import UserAnalytics from "./user/analytics";
import Team from "./user/team";
import APIKeys from "./user/api-keys";
import UserBilling from "./user/billing";
import UserSettings from "./user/settings";
import UserSupport from "./user/support";

export {
  // Public
  LandingPage,
  RootPage,
  NotFound,

  // Auth
  Login,
  Register,
  VerifyOtp,
  ForgotPassword,
  ResetPassword,
  AcceptInvite,
  IsLogin,
  RoleGuard,
  GuestRoute,

  // Super Admin
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

  // User
  UserDashboard,
  NewArticle,
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
};
