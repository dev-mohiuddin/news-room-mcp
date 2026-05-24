import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/animations";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="relative py-28">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            Pricing
          </p>
          <h2 className="font-display text-4xl md:text-5xl">
            Simple pricing.{" "}
            <span className="gradient-text">Powerful publishing.</span>
          </h2>

          <div className="mt-8 inline-flex items-center gap-3 rounded-full glass border border-white/10 px-4 py-2">
            <span
              className={cn(
                "text-sm",
                !yearly ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Monthly
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span
              className={cn(
                "text-sm",
                yearly ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Yearly
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Save 20%
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {PLANS.map((plan) => (
            <motion.div key={plan.id} variants={staggerItem}>
              <GlassCard
                hover
                glow={plan.highlight ? "blue" : null}
                className={cn(
                  "p-7 h-full flex flex-col relative",
                  plan.highlight && "lg:scale-[1.04]"
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest gradient-bg text-white px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <h3 className="font-display text-xl">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={yearly ? "y" : "m"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="font-display text-4xl"
                    >
                      {yearly ? plan.yearlyPrice : plan.price}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-sm flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-brand-teal shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.highlight ? (
                  <GradientButton className="mt-7 w-full" size="md">
                    {plan.cta} <Sparkles className="h-4 w-4" />
                  </GradientButton>
                ) : (
                  <Button variant="glass" className="mt-7 w-full">
                    {plan.cta}
                  </Button>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
