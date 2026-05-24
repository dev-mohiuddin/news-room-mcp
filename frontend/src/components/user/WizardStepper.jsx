import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function WizardStepper({ steps = [], current = 1, onStepClick }) {
  return (
    <div className="relative">
      {/* progress line */}
      <div className="absolute top-5 left-[5%] right-[5%] h-px bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: `${((current - 1) / Math.max(1, steps.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="h-full gradient-bg"
        />
      </div>

      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((step, idx) => {
          const n = idx + 1;
          const isDone = n < current;
          const isActive = n === current;
          const clickable = n <= current && !!onStepClick;

          return (
            <li key={step.id} className="flex flex-col items-center text-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onStepClick?.(n)}
                className={cn(
                  "relative h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  isActive &&
                    "gradient-bg text-white shadow-[0_4px_30px_rgba(139,92,246,0.5)] ring-4 ring-primary/20",
                  isDone &&
                    "gradient-bg text-white shadow-[0_4px_20px_rgba(45,212,191,0.4)]",
                  !isActive &&
                    !isDone &&
                    "glass border border-white/10 text-muted-foreground",
                  clickable && !isActive && "hover:border-white/30"
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : n}
              </button>
              <p
                className={cn(
                  "mt-2 text-xs font-medium tracking-wide",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              <p className="text-[10px] text-muted-foreground/60 hidden md:block">
                {step.hint}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
