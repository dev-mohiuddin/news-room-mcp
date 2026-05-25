import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleSidebarCollapsed,
  toggleSidebar,
} from "@/redux/slice/ui-slice";
import Logo from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useAuth from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useMemo } from "react";
import {
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  X,
} from "lucide-react";
import useMediaQuery from "@/hooks/useMediaQuery";
import { useEffect } from "react";

export default function Sidebar({ nav = [], variant = "user" }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const collapsed = useSelector((s) => s.ui.sidebarCollapsed);
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Filter nav by permissions — items without `requiredPerm` are always shown.
  // Empty groups (no visible items) are hidden entirely.
  const visibleNav = useMemo(() => {
    return nav
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => !item.requiredPerm || hasPermission(user, item.requiredPerm)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [nav, user]);

  // Auto-close mobile drawer on navigation.
  useEffect(() => {
    if (!isDesktop && sidebarOpen) {
      dispatch(toggleSidebar());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isDesktop]);

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/dashboard" &&
      path !== "/admin/dashboard" &&
      location.pathname.startsWith(path));

  const drawerOpen = !isDesktop && sidebarOpen;
  // On desktop the sidebar is always visible; on mobile it's an overlay drawer.
  const showSidebar = isDesktop || drawerOpen;
  // Collapsed state only matters on desktop.
  const effectiveCollapsed = isDesktop ? collapsed : false;

  const sidebarContent = (
    <>
      {/* header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
        {effectiveCollapsed ? (
          <Logo withText={false} size="sm" />
        ) : (
          <Logo size="sm" />
        )}
        {!effectiveCollapsed && variant === "admin" && (
          <span className="text-[10px] uppercase tracking-widest gradient-bg text-white px-2 py-0.5 rounded-full">
            Admin
          </span>
        )}
        {drawerOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-hide">
        {visibleNav.map((group) => (
          <div key={group.group}>
            {!effectiveCollapsed && (
              <p className="px-2 mb-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                {group.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = Icons[item.icon] ?? Icons.Circle;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      title={effectiveCollapsed ? item.label : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                        "transition-all duration-200 ease-out",
                        active
                          ? "text-foreground bg-gradient-to-r from-primary/[0.12] via-secondary/[0.10] to-transparent border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_-4px_rgba(139,92,246,0.30)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
                        effectiveCollapsed && "justify-center px-2"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full gradient-bg shadow-[0_0_12px_rgba(139,92,246,0.6)]" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active && "text-primary"
                        )}
                      />
                      {!effectiveCollapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                      {!effectiveCollapsed && item.highlight && (
                        <Sparkles className="h-3.5 w-3.5 text-brand-teal" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* user + collapse */}
      <div className="p-3 border-t border-white/10 space-y-2 shrink-0">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 glass border border-white/5",
            effectiveCollapsed && "justify-center"
          )}
        >
          <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {(user?.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
          </div>
          {!effectiveCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || ""}
              </p>
            </div>
          )}
          {!effectiveCollapsed && (
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {isDesktop && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(toggleSidebarCollapsed())}
            className="w-full text-muted-foreground"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" /> Collapse
              </>
            )}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      {isDesktop && (
        <motion.aside
          animate={{ width: collapsed ? 76 : 264 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative shrink-0 h-screen border-r border-white/10 glass flex flex-col z-30"
        >
          {sidebarContent}
        </motion.aside>
      )}

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch(toggleSidebar())}
              className="lg:hidden fixed inset-0 bg-background/70 backdrop-blur-md z-40"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] border-r border-white/10 glass-strong flex flex-col z-50"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
