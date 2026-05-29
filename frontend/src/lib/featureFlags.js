/**
 * Frontend feature-flag accessors. Vite exposes env vars under
 * `import.meta.env.VITE_*`. Keep this module the only place that
 * reads those — easier to audit and to mock in tests.
 */

export const isWizardEnabled = () =>
  String(import.meta.env.VITE_ENABLE_WIZARD || "false").toLowerCase() === "true";

export const featureFlags = {
  get wizard() {
    return isWizardEnabled();
  },
};
