import React from "react";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";

/**
 * Top-level error boundary — catches runtime errors and shows a friendly fallback
 * instead of a white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In production this would go to Sentry / equivalent.
    // Keeping console for dev visibility.
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  goHome = () => {
    this.reset();
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 bg-background overflow-hidden">
        {/* subtle backdrop */}
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div
          className="orb orb-violet pointer-events-none"
          style={{ width: 480, height: 480, top: "20%", right: "-10%" }}
        />
        <div
          className="orb orb-blue pointer-events-none"
          style={{ width: 480, height: 480, bottom: "-10%", left: "-10%" }}
        />

        <div className="relative max-w-md mx-auto text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 mb-5">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="font-display text-3xl">Something broke</h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            We hit an unexpected error. The page will reset, or you can return
            to the home screen.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-5 p-4 rounded-xl glass text-left text-[11px] font-mono text-red-400 overflow-auto max-h-40">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}

          <div className="mt-7 flex items-center justify-center gap-3">
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full glass border border-white/15 hover:border-white/30 text-sm transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
            <button
              onClick={this.goHome}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full gradient-bg text-white text-sm shadow-[0_8px_24px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_32px_rgba(139,92,246,0.45)] transition-shadow"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
