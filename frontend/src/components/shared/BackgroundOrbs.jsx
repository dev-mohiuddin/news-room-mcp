// Reusable animated background — gradient orbs + grid + noise overlay.
// Used across landing hero, auth pages, dashboard backgrounds.
export default function BackgroundOrbs({
  variant = "default", // 'default' | 'auth' | 'dashboard'
  gridBg = true,
}) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {gridBg && <div className="absolute inset-0 grid-bg opacity-60" />}
      <div className="absolute inset-0 hero-gradient-overlay" />

      {/* Floating orbs */}
      <div
        className="orb orb-blue"
        style={{ width: 520, height: 520, top: "-10%", left: "-10%" }}
      />
      <div
        className="orb orb-violet"
        style={{ width: 600, height: 600, top: "20%", right: "-15%" }}
      />
      <div
        className="orb orb-teal"
        style={{ width: 480, height: 480, bottom: "-15%", left: "30%" }}
      />
      {variant === "default" && (
        <>
          <div
            className="orb orb-pink"
            style={{ width: 320, height: 320, top: "60%", left: "5%" }}
          />
          <div
            className="orb orb-orange"
            style={{ width: 380, height: 380, bottom: "10%", right: "20%" }}
          />
        </>
      )}

      {/* Noise overlay */}
      <div className="absolute inset-0 noise-overlay" />
    </div>
  );
}
