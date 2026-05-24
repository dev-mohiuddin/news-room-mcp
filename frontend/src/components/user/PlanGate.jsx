import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";

/**
 * Lockout / upsell card shown when current plan does not include a feature.
 */
export default function PlanGate({
  feature = "This feature",
  requiredPlan = "Pro",
  description,
  cta = "Upgrade plan",
}) {
  return (
    <GlassCard
      glow="violet"
      className="p-8 md:p-12 text-center max-w-2xl mx-auto"
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg mb-5 shadow-[0_8px_30px_rgba(139,92,246,0.4)]">
        <Lock className="h-5 w-5 text-white" />
      </span>
      <h3 className="font-display text-2xl">
        {feature} is on{" "}
        <span className="gradient-text">{requiredPlan}</span>
      </h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
        {description ||
          `Upgrade to ${requiredPlan} to unlock this feature and many more powerful workflows.`}
      </p>
      <Link to="/dashboard/billing" className="inline-block mt-6">
        <GradientButton size="md">
          <Sparkles className="h-4 w-4" /> {cta}{" "}
          <ArrowRight className="h-4 w-4" />
        </GradientButton>
      </Link>
    </GlassCard>
  );
}
