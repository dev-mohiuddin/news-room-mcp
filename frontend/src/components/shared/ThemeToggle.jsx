import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex items-center justify-center h-9 w-9 rounded-full glass border border-white/10 hover:border-white/20 transition-colors",
        className
      )}
    >
      <motion.div
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-brand-violet" />
        ) : (
          <Sun className="h-4 w-4 text-brand-orange" />
        )}
      </motion.div>
    </button>
  );
}
