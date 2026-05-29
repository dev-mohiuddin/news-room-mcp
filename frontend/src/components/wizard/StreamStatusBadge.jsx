import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useSelector } from "react-redux";

import {
  selectStreamConnected,
  selectStreamPolling,
} from "@/redux/slice/wizard-slice";
import { cn } from "@/lib/utils";

/**
 * Compact connection indicator for the wizard header. Three states:
 *   - Live      → socket connected, real-time stream
 *   - Polling   → socket disconnected, polling fallback active
 *   - Offline   → neither (briefly, on initial mount)
 */
export default function StreamStatusBadge() {
  const connected = useSelector(selectStreamConnected);
  const polling = useSelector(selectStreamPolling);

  let label, Icon, color;
  if (connected) {
    label = "Live";
    Icon = Wifi;
    color = "text-emerald-300";
  } else if (polling) {
    label = "Polling";
    Icon = RefreshCw;
    color = "text-amber-300";
  } else {
    label = "Offline";
    Icon = WifiOff;
    color = "text-muted-foreground";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest glass border border-white/10 rounded-md px-2 py-1",
        color
      )}
      title="Stream connection status"
    >
      <Icon className={cn("h-3 w-3", polling && "animate-spin")} />
      {label}
    </span>
  );
}
