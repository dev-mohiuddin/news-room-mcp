import { motion } from "framer-motion";
import {
  Search,
  Sparkles,
  TrendingUp,
  Globe,
  Mic,
  Users,
} from "lucide-react";
import { staggerContainer, staggerItem, fadeUp } from "@/lib/animations";
import GlassCard from "@/components/shared/GlassCard";
import { FEATURES_LIST } from "@/lib/constants";

const ICONS = { Search, Sparkles, TrendingUp, Globe, Mic, Users };

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-28">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            Features
          </p>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight">
            Everything you need to{" "}
            <span className="gradient-text">publish at AI speed</span>
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES_LIST.map((f, i) => {
            const Icon = ICONS[f.icon] ?? Sparkles;
            return (
              <motion.div
                key={i}
                variants={staggerItem}
                className={f.highlight ? "lg:row-span-2" : ""}
              >
                <GlassCard hover glow="violet" className="p-7 h-full">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {f.tag}
                  </span>
                  <div className="mt-4 inline-flex h-12 w-12 items-center justify-center rounded-xl glass border border-white/10">
                    <Icon className="h-5 w-5 text-brand-blue" />
                  </div>
                  <h3 className="mt-6 font-display text-xl">{f.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>

                  {f.highlight && (
                    <div className="mt-8 space-y-3">
                      {[
                        ["Drafted", "1,420 words"],
                        ["Tone", "Editorial · 96% match"],
                        ["Quality", "★★★★★"],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-center justify-between rounded-lg glass border border-white/5 px-3 py-2 text-xs"
                        >
                          <span className="text-muted-foreground">{k}</span>
                          <span className="font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
