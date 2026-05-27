import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { fetchPublicSettings } from "@/redux/slice/system-slice";

/**
 * ============================================================
 *  MaintenanceBanner
 * ============================================================
 *
 *  Mounted in both UserLayout and SuperAdminLayout. Polls the public
 *  settings endpoint every 60s so users see the banner appear / vanish
 *  without a refresh. The banner is purely informational — the actual
 *  enforcement happens server-side in `maintenanceMiddleware.js`,
 *  which returns 503 for non-admin requests.
 */

const POLL_INTERVAL_MS = 60_000;

export default function MaintenanceBanner() {
  const dispatch = useDispatch();
  const settings = useSelector((s) => s.system.publicSettings);

  useEffect(() => {
    dispatch(fetchPublicSettings());
    const t = setInterval(() => {
      dispatch(fetchPublicSettings());
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [dispatch]);

  if (!settings?.maintenance?.enabled) return null;

  return (
    <div
      role="alert"
      className="relative z-30 border-b border-amber-500/30 bg-amber-500/10 backdrop-blur-md"
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-2 flex items-start gap-2.5 text-amber-100">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-300" />
        <p className="text-xs md:text-sm leading-snug">
          <span className="font-semibold mr-1.5 text-amber-200">
            Maintenance:
          </span>
          {settings.maintenance.message ||
            "We're upgrading our infrastructure. Some features may be temporarily unavailable."}
        </p>
      </div>
    </div>
  );
}
