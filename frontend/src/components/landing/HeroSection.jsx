import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles, Check } from "lucide-react";
import GradientButton from "@/components/shared/GradientButton";
import BackgroundOrbs from "@/components/shared/BackgroundOrbs";
import { Button } from "@/components/ui/button";
import { fadeUp, scaleIn, floatAnimation } from "@/lib/animations";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-20">
      <BackgroundOrbs />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Announcement badge */}
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass gradient-border text-xs md:text-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-muted-foreground">
            ✦ Introducing AI-Powered Publishing — Now in Beta
          </span>
          <ArrowRight className="h-3.5 w-3.5 opacity-60" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="font-display font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl mt-8 leading-[1.05] tracking-[-0.04em]"
        >
          Publish Smarter.
          <br />
          <span className="gradient-text">Write with AI.</span>
          <br />
          Reach Further.
        </motion.h1>

        {/* Subhead */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed"
        >
          From research to published article in minutes. Newsroom MCP connects
          your AI assistant to every CMS, SEO tool, and publishing workflow you
          need.
        </motion.p>

        {/* CTA row */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/auth/register">
            <GradientButton size="lg">
              Start for Free <ArrowRight className="h-4 w-4" />
            </GradientButton>
          </Link>
          <Button variant="glass" size="lg" className="rounded-full">
            <Play className="h-4 w-4" /> Watch Demo
          </Button>
        </motion.div>

        {/* Social proof */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <div className="flex -space-x-2">
            {[
              "from-blue-500 to-violet-500",
              "from-violet-500 to-pink-500",
              "from-pink-500 to-orange-500",
              "from-orange-500 to-teal-500",
              "from-teal-500 to-blue-500",
            ].map((g, i) => (
              <div
                key={i}
                className={`h-7 w-7 rounded-full bg-gradient-to-br ${g} border-2 border-background`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Trusted by <span className="text-foreground font-semibold">2,400+</span>{" "}
            publishers and agencies
          </p>
        </motion.div>

        {/* Hero mockup */}
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
          className="mt-16 relative max-w-5xl mx-auto"
        >
          <motion.div
            variants={floatAnimation}
            animate="animate"
            className="relative rounded-2xl glass-strong gradient-border glow-blue overflow-hidden"
          >
            <DashboardMockup />
          </motion.div>

          {/* glow under mockup */}
          <div
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-32 rounded-[100%]"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(139,92,246,0.4) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="text-left">
      {/* top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-muted-foreground">
          newsroommcp.com / dashboard / new-article
        </span>
      </div>

      <div className="grid grid-cols-12 min-h-[420px]">
        {/* sidebar */}
        <div className="col-span-2 border-r border-white/10 p-3 flex flex-col gap-2">
          {[
            "Dashboard",
            "New",
            "Articles",
            "Research",
            "SEO",
            "CMS",
            "Brand",
          ].map((l, i) => (
            <div
              key={l}
              className={`h-8 rounded-md flex items-center px-2 text-xs ${
                i === 1
                  ? "gradient-bg text-white"
                  : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              {l}
            </div>
          ))}
        </div>

        {/* main */}
        <div className="col-span-7 p-6 space-y-4">
          <div className="text-xs text-muted-foreground uppercase tracking-widest">
            Step 3 of 5 · Drafting
          </div>
          <h3 className="font-display text-2xl">
            10 SEO Strategies That Work in 2026
          </h3>
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>
              Search engines have changed. Modern SEO is no longer about keyword
              stuffing or link farms. The strategies that move the needle today
              center on intent, depth, and AI-readable structure.
            </p>
            <p>
              In this article, we walk through the ten approaches our team has
              measured across 800+ articles in the past 12 months
              <span className="inline-block w-2 h-4 ml-0.5 bg-primary align-middle animate-cursor" />
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <span className="text-xs px-2 py-1 rounded-md glass border border-white/10">
              ✓ 1,420 words
            </span>
            <span className="text-xs px-2 py-1 rounded-md glass border border-white/10">
              ✓ Reading time 6 min
            </span>
            <span className="text-xs px-2 py-1 rounded-md glass border border-white/10 text-emerald-400">
              ✓ Brand voice match 96%
            </span>
          </div>
        </div>

        {/* SEO panel */}
        <div className="col-span-3 border-l border-white/10 p-4 space-y-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">SEO Score</div>
            <div className="font-display text-3xl gradient-text">94/100</div>
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-[94%] gradient-bg" />
            </div>
          </div>
          <div className="space-y-2 text-xs">
            {[
              ["Keyword density", "✓"],
              ["Meta title", "✓"],
              ["Meta description", "✓"],
              ["Internal links", "✓"],
              ["FAQ schema", "✓"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* status bar */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand-violet" /> Auto-saved 4
          seconds ago
        </span>
        <span className="text-emerald-400 flex items-center gap-1">
          <Check className="h-3.5 w-3.5" /> Publishing to WordPress · Done
        </span>
      </div>
    </div>
  );
}
