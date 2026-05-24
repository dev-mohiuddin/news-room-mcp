import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * GlassCard — base glass surface with subtle, eye-comfortable shadow.
 *
 * Props:
 *  - hover: enables soft lift + tinted shadow on hover
 *  - glow: 'blue' | 'violet' | 'teal' — adds gentle colored aura on hover
 *  - gradientBorder: thin gradient outline (default true)
 *  - accent: subtle pulsing accent ring on hover (great for important cards)
 */
export default function GlassCard({
  children,
  className,
  gradientBorder = true,
  hover = false,
  glow = null,
  accent = false,
  as: Component = "div",
  ...props
}) {
  const glowHoverClass =
    glow === "blue"
      ? "hover:shadow-[var(--glow-blue),var(--shadow-soft-lg)]"
      : glow === "violet"
      ? "hover:shadow-[var(--glow-violet),var(--shadow-soft-lg)]"
      : glow === "teal"
      ? "hover:shadow-[var(--glow-teal),var(--shadow-soft-lg)]"
      : "";

  const Cmp = hover ? motion.div : Component;
  const animProps = hover
    ? {
        whileHover: { y: -2 },
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      }
    : {};

  return (
    <Cmp
      {...animProps}
      className={cn(
        "relative rounded-2xl glass overflow-hidden",
        "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        gradientBorder && "gradient-border",
        hover && "card-hover",
        accent && "glow-accent",
        glowHoverClass,
        className
      )}
      {...props}
    >
      {children}
    </Cmp>
  );
}
