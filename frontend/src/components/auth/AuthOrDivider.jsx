export default function AuthOrDivider({ label = "or continue with" }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-white/10" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground bg-card">
          — {label} —
        </span>
      </div>
    </div>
  );
}
