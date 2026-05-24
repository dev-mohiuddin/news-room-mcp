import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { fadeUp, glowPulse } from "@/lib/animations";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="relative py-28 border-y border-white/5 overflow-hidden">
      {/* gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.18) 50%, rgba(45,212,191,0.12) 100%)",
        }}
      />
      <div className="absolute inset-0 grid-bg opacity-50 -z-10" />
      <div
        className="orb orb-blue -z-10"
        style={{ width: 500, height: 500, top: "-20%", left: "10%" }}
      />
      <div
        className="orb orb-violet -z-10"
        style={{ width: 500, height: 500, bottom: "-30%", right: "10%" }}
      />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="relative max-w-4xl mx-auto px-6 text-center"
      >
        <h2 className="font-display text-4xl md:text-6xl">
          Start publishing{" "}
          <span className="gradient-text">smarter today.</span>
        </h2>
        <p className="mt-6 max-w-xl mx-auto text-muted-foreground">
          Join 12,000+ publishers. No credit card required for the free plan.
        </p>

        <motion.div
          variants={glowPulse}
          initial="initial"
          animate="animate"
          className="inline-block mt-10 rounded-full"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth/register">
              <GradientButton size="lg">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </GradientButton>
            </Link>
            <Button variant="glass" size="lg" className="rounded-full">
              Schedule a Demo
            </Button>
          </div>
        </motion.div>

        <p className="mt-6 text-xs text-muted-foreground">
          14-day free trial on paid plans. Cancel anytime.
        </p>
      </motion.div>
    </section>
  );
}
