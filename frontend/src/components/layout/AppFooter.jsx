import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function AppFooter({ variant = "user" }) {
  return (
    <footer className="relative shrink-0 border-t border-white/10 glass">
      {/* subtle gradient highlight on top edge */}
      <span
        aria-hidden="true"
        className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
      />

      <div className="px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            {APP_NAME}{" "}
            <span className="text-foreground/70 font-medium">v1.0.0</span>
          </span>
          <span className="hidden sm:inline opacity-50">·</span>
          <span className="hidden sm:inline">
            © {new Date().getFullYear()} All rights reserved.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            All systems operational
          </span>
          <span className="opacity-50">·</span>
          <Link
            to={variant === "admin" ? "/admin/support" : "/dashboard/support"}
            className="hover:text-foreground transition-colors"
          >
            Support
          </Link>
          <span className="hidden sm:inline opacity-50">·</span>
          <span className="hidden sm:inline-flex items-center gap-1">
            Built with{" "}
            <Heart className="h-3 w-3 text-brand-pink animate-pulse-dot" /> and
            AI
          </span>
        </div>
      </div>
    </footer>
  );
}
