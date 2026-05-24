import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import AppFooter from "@/components/layout/AppFooter";
import BackgroundOrbs from "@/components/shared/BackgroundOrbs";
import { SUPER_ADMIN_NAV } from "@/lib/constants";
import { pageTransition } from "@/lib/animations";

const TITLE_MAP = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Users",
  "/admin/plans": "Plans",
  "/admin/billing": "Billing",
  "/admin/integrations": "Integrations",
  "/admin/content": "Content Monitor",
  "/admin/analytics": "Analytics",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Settings",
  "/admin/logs": "Audit Logs",
  "/admin/support": "Support",
};

export default function SuperAdminLayout() {
  const location = useLocation();
  const title =
    TITLE_MAP[location.pathname] ||
    (location.pathname.startsWith("/admin/users") ? "User Detail" : "Admin");

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <BackgroundOrbs gridBg={false} />

      <Sidebar nav={SUPER_ADMIN_NAV} variant="admin" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} variant="admin" />
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
            <motion.div
              key={location.pathname}
              variants={pageTransition}
              initial="initial"
              animate="animate"
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
        <AppFooter variant="admin" />
      </div>
    </div>
  );
}
