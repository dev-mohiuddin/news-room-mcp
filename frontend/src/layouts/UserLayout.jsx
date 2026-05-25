import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import AppFooter from "@/components/layout/AppFooter";
import BackgroundOrbs from "@/components/shared/BackgroundOrbs";
import { USER_NAV } from "@/lib/constants";
import { pageTransition } from "@/lib/animations";

const TITLE_MAP = {
  "/dashboard": "Dashboard",
  "/dashboard/new-article": "New Article",
  "/dashboard/articles": "Articles",
  "/dashboard/research": "Research",
  "/dashboard/seo": "SEO Tools",
  "/dashboard/cms": "CMS Connections",
  "/dashboard/brand-voice": "Brand Voice",
  "/dashboard/templates": "Templates",
  "/dashboard/analytics": "Analytics",
  "/dashboard/team": "Team",
  "/dashboard/api-keys": "API Keys",
  "/dashboard/billing": "Billing",
  "/dashboard/settings": "Settings",
  "/dashboard/support": "Support",
};

export default function UserLayout() {
  const location = useLocation();
  const title = TITLE_MAP[location.pathname] || "Workspace";

  return (
    <div className="relative flex h-screen overflow-hidden">
      <BackgroundOrbs gridBg={false} />

      <Sidebar nav={USER_NAV} variant="user" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} variant="user" />
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
        <AppFooter variant="user" />
      </div>
    </div>
  );
}
