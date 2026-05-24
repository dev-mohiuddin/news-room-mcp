import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Quote, Sparkles, ShieldCheck } from "lucide-react";
import BackgroundOrbs from "@/components/shared/BackgroundOrbs";
import GlassCard from "@/components/shared/GlassCard";
import Logo from "@/components/shared/Logo";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { fadeUp, scaleIn } from "@/lib/animations";

export default function AuthLayout({ children, side = "right" }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundOrbs />

      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="relative z-10 grid lg:grid-cols-2 min-h-screen">
        {/* left panel: showcase (desktop only) */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className={`hidden lg:flex flex-col justify-center px-16 py-24 ${
            side === "right" ? "order-1" : "order-2"
          }`}
        >
          <div className="max-w-md space-y-8">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              The Newsroom OS
            </p>
            <h1 className="font-display text-5xl leading-tight">
              From research to <span className="gradient-text">published</span>{" "}
              in minutes.
            </h1>

            <ul className="space-y-3 text-sm">
              {[
                ["AI drafts that match your brand voice", Sparkles],
                ["One-click publishing to any CMS", ShieldCheck],
                ["SEO score, FAQs, and meta — generated", Sparkles],
              ].map(([txt, Ic], i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="h-7 w-7 rounded-md gradient-bg flex items-center justify-center shrink-0">
                    <Ic className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span className="text-muted-foreground pt-1">{txt}</span>
                </li>
              ))}
            </ul>

            <GlassCard className="p-5">
              <Quote className="h-5 w-5 text-brand-violet/50 mb-2" />
              <p className="text-sm leading-relaxed">
                “We went from 8 hours per article to 3 articles in a morning. The
                SEO scores beat our manual workflow consistently.”
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                — Sarah Chen, Head of Content @ TechBuzz Media
              </p>
            </GlassCard>
          </div>
        </motion.div>

        {/* right panel: form */}
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className={`flex items-center justify-center px-4 sm:px-6 py-20 ${
            side === "right" ? "order-2" : "order-1"
          }`}
        >
          <GlassCard
            glow="violet"
            className="w-full max-w-[460px] p-7 md:p-9 relative"
          >
            {/* corner glow accents */}
            <span className="pointer-events-none absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            {children}
          </GlassCard>
        </motion.div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Newsroom MCP ·{" "}
        <Link to="/" className="hover:text-foreground">
          Back to home
        </Link>
      </div>
    </div>
  );
}
