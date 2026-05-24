import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Glass breadcrumb trail.
 * items: [{ label, to? }] — last item without `to` becomes current page.
 */
export default function Breadcrumb({ items = [], className }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-xs", className)}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            to="/"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
          >
            <Home className="h-3 w-3" />
          </Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="px-2 py-1 text-foreground font-medium"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
