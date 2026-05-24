import { motion } from "framer-motion";
import GlassCard from "@/components/shared/GlassCard";
import { fadeUp } from "@/lib/animations";

// Reusable placeholder while pages are scaffolding — keeps the design system
// visible everywhere even before real content is wired up.
export default function PagePlaceholder({
  title,
  description = "Coming soon. This page is part of the scaffold.",
  children,
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div>
        <h1 className="font-display text-3xl">
          <span className="gradient-text">{title}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <GlassCard className="p-10 min-h-[300px] flex items-center justify-center">
        {children || (
          <p className="text-muted-foreground text-sm">
            Wire your data + components here.
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}
