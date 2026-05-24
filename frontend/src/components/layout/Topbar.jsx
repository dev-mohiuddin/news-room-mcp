import { useDispatch } from "react-redux";
import { Zap, Menu } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import ThemeToggle from "@/components/shared/ThemeToggle";
import NotificationBell from "@/components/shared/NotificationBell";
import SearchCommand from "@/components/shared/SearchCommand";

import useAuth from "@/hooks/useAuth";
import { toggleSidebar } from "@/redux/slice/ui-slice";
import { cn } from "@/lib/utils";

export default function Topbar({ title, variant = "user" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Demo data — would come from billing slice in production
  const creditsRemaining = 47;
  const creditsTotal = 200;
  const creditsLow = creditsRemaining / creditsTotal < 0.2;

  return (
    <header className="relative h-16 shrink-0 border-b border-white/10 glass flex items-center justify-between px-4 md:px-6 gap-3 z-20">
      {/* subtle highlight on bottom edge */}
      <span
        aria-hidden="true"
        className="absolute -bottom-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent pointer-events-none"
      />

      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile sidebar trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden rounded-full"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="min-w-0">
          <h1 className="font-display text-base md:text-lg leading-none truncate">
            {title || "Dashboard"}
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            {variant === "admin"
              ? "Platform administration"
              : "Your AI publishing workspace"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        {variant === "user" && (
          <Link
            to="/dashboard/billing"
            className={cn(
              "hidden md:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass border transition-all",
              creditsLow
                ? "border-amber-500/40 text-amber-400 hover:border-amber-500/60"
                : "border-white/10 text-brand-teal hover:border-white/25"
            )}
            title="Manage plan"
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {creditsRemaining}/{creditsTotal}
            </span>
            <span className="hidden xl:inline">articles</span>
          </Link>
        )}

        <SearchCommand variant={variant} />

        <NotificationBell variant={variant} />

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "ml-1 inline-flex items-center gap-2 rounded-full glass border border-white/10 pl-1 pr-1 sm:pr-3 py-1",
                "hover:border-white/25 hover:shadow-[0_4px_16px_rgba(139,92,246,0.18)]",
                "transition-all duration-200"
              )}
            >
              <Avatar className="h-7 w-7 ring-2 ring-white/10">
                <AvatarFallback className="gradient-bg text-white text-xs">
                  {(user?.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">
                {user?.name?.split(" ")[0] || "Account"}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60 glass-strong border-white/10">
            <DropdownMenuLabel>
              <p className="text-sm font-medium truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || ""}
              </p>
              {user?.role && (
                <span className="inline-block mt-1.5 text-[9px] uppercase tracking-widest gradient-bg text-white px-1.5 py-0.5 rounded">
                  {user.role.replace("_", " ")}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                navigate(
                  variant === "admin" ? "/admin/settings" : "/dashboard/settings"
                )
              }
            >
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigate(
                  variant === "admin" ? "/admin/billing" : "/dashboard/billing"
                )
              }
            >
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/")}>
              Back to landing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
