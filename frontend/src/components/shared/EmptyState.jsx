import { Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  description,
  action,
  onAction,
  variant = "default", // 'default' | 'compact'
  className,
}) {
  const compact = variant === "compact";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl glass border border-white/5",
        compact ? "py-10 px-6" : "py-16 px-6",
        className
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full gradient-bg opacity-40 blur-xl animate-soft-float" />
        <div className="relative h-14 w-14 rounded-full gradient-bg flex items-center justify-center shadow-[0_8px_24px_rgba(139,92,246,0.30)]">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>

      <h3 className="font-display text-lg mt-5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button className="mt-5" variant="gradient" onClick={onAction}>
          {action}
        </Button>
      )}
    </motion.div>
  );
}
