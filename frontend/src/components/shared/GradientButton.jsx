import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function GradientButton({
  children,
  className,
  size = "lg",
  type = "button",
  ...props
}) {
  const sizeClass =
    size === "sm"
      ? "h-9 px-5 text-sm"
      : size === "md"
      ? "h-11 px-6 text-sm"
      : "h-12 px-8 text-base";

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.975 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden",
        "rounded-full font-semibold text-white gradient-bg",
        "shadow-[0_8px_28px_rgba(59,130,246,0.32),inset_0_1px_0_rgba(255,255,255,0.25)]",
        "hover:shadow-[0_14px_44px_rgba(139,92,246,0.50),inset_0_1px_0_rgba(255,255,255,0.30)]",
        "transition-shadow duration-300",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        sizeClass,
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {/* subtle moving shimmer — slower so it feels classy */}
      <span className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <span className="block h-full w-full animate-shimmer" />
      </span>
    </motion.button>
  );
}
