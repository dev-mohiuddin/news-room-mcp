import { motion } from "framer-motion";

export default function PageLoader({ label = "Loading workspace" }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
      {/* subtle backdrop orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="orb orb-violet"
          style={{ width: 360, height: 360, top: "30%", left: "30%" }}
        />
        <div
          className="orb orb-blue"
          style={{ width: 360, height: 360, top: "30%", right: "30%" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative flex flex-col items-center"
      >
        <div className="relative h-16 w-16">
          {/* outer rotating ring */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, #3B82F6 90deg, #8B5CF6 180deg, #2DD4BF 270deg, transparent 360deg)",
              animation: "spin 1.6s linear infinite",
              maskImage:
                "radial-gradient(circle, transparent 24px, black 25px)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 24px, black 25px)",
            }}
          />
          {/* inner core */}
          <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center shadow-[inset_0_0_24px_rgba(139,92,246,0.20)]">
            <span className="h-2 w-2 rounded-full gradient-bg animate-pulse-dot" />
          </div>
        </div>

        <p className="mt-5 text-sm text-muted-foreground tracking-wide animate-pulse">
          {label}…
        </p>
      </motion.div>
    </div>
  );
}
