import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import AnimatedCounter from "@/components/shared/AnimatedCounter";
import GlassCard from "@/components/shared/GlassCard";
import { STATS } from "@/lib/constants";

export default function StatsSection() {
  return (
    <section className="relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={staggerContainer(0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {STATS.map((s, i) => (
            <motion.div key={i} variants={staggerItem}>
              <GlassCard className="p-6 text-center">
                <div className="font-display text-4xl md:text-5xl gradient-text">
                  <AnimatedCounter
                    value={s.value}
                    decimals={s.value % 1 !== 0 ? 1 : 0}
                    suffix={s.suffix}
                  />
                </div>
                <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
