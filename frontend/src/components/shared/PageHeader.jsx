import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex flex-col md:flex-row md:items-end md:justify-between gap-4",
        className
      )}
    >
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl">
          <span className="gradient-text">{title}</span>
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
