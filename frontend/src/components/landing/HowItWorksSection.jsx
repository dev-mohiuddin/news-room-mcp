import { motion } from "framer-motion";
import { staggerContainer, staggerItem, fadeUp } from "@/lib/animations";
import GlassCard from "@/components/shared/GlassCard";
import { HOW_IT_WORKS } from "@/lib/constants";

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-28">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            How it works
          </p>
          <h2 className="font-display text-4xl md:text-5xl">
            From idea to published in{" "}
            <span className="gradient-text">5 steps</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            No more tab-switching between research, writing, SEO, and CMS tools.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.15)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5"
        >
          {/* Connecting gradient line (desktop) */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-px gradient-bg opacity-30" />

          {HOW_IT_WORKS.map((step) => (
            <motion.div key={step.n} variants={staggerItem}>
              <GlassCard hover className="p-6 h-full text-center">
                <div className="mx-auto h-14 w-14 rounded-full gradient-bg flex items-center justify-center text-2xl shadow-[0_8px_30px_rgba(59,130,246,0.4)]">
                  {step.icon}
                </div>
                <div className="mt-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Step {step.n}
                </div>
                <h3 className="mt-1 font-display text-lg">{step.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
