import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Logo({ className, withText = true, size = "md" }) {
  const dim = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  return (
    <Link to="/" className={cn("flex items-center gap-2 group", className)}>
      <span
        className="relative inline-flex items-center justify-center rounded-xl gradient-bg shadow-[0_4px_20px_rgba(59,130,246,0.4)] group-hover:shadow-[0_4px_30px_rgba(139,92,246,0.6)] transition-shadow"
        style={{ width: dim, height: dim }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width={dim * 0.55}
          height={dim * 0.55}
        >
          <path
            d="M5 7h7v6h7v6H5z"
            fill="white"
            fillOpacity="0.95"
          />
          <circle cx="18" cy="6" r="2.2" fill="white" />
        </svg>
      </span>
      {withText && (
        <span className="font-display font-bold text-lg leading-none tracking-tight">
          Newsroom <span className="gradient-text">MCP</span>
        </span>
      )}
    </Link>
  );
}
