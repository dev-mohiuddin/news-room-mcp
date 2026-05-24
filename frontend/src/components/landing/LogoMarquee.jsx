import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { CMS_LOGOS } from "@/lib/constants";

export default function LogoMarquee() {
  const row1 = [...CMS_LOGOS, ...CMS_LOGOS];
  const row2 = [...CMS_LOGOS.slice().reverse(), ...CMS_LOGOS.slice().reverse()];

  return (
    <section className="relative py-20 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-10"
        >
          Integrates with your entire publishing stack
        </motion.p>

        <div className="space-y-4 mask-fade-x overflow-hidden">
          <div className="flex gap-4 animate-marquee w-max">
            {row1.map((name, i) => (
              <Pill key={`a-${i}`} name={name} />
            ))}
          </div>
          <div className="flex gap-4 animate-marquee-reverse w-max">
            {row2.map((name, i) => (
              <Pill key={`b-${i}`} name={name} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pill({ name }) {
  return (
    <div className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full glass border border-white/10">
      <span className="h-6 w-6 rounded-md gradient-bg flex items-center justify-center text-[10px] font-bold text-white">
        {name.charAt(0)}
      </span>
      <span className="text-sm font-medium whitespace-nowrap">{name}</span>
    </div>
  );
}
