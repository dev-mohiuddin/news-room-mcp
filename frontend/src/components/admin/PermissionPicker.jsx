import { useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Grouped checkbox list driven by the backend permission catalog.
 *
 * Props
 *   catalog   { platform: [...], tenant: [...] } — from backend
 *   scope     "platform" | "tenant"               — which catalog branch to render
 *   value     string[]                            — currently selected perms
 *   onChange  (next: string[]) => void
 *   disabled  boolean
 *   isSuperAdminContext  boolean — show super-admin-only items
 */
export default function PermissionPicker({
  catalog,
  scope = "platform",
  value = [],
  onChange,
  disabled = false,
  isSuperAdminContext = true,
}) {
  const groups = useMemo(() => {
    if (!catalog) return [];
    return catalog[scope] || [];
  }, [catalog, scope]);

  const selected = new Set(value);

  const toggle = (key) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange?.(Array.from(next));
  };

  const selectGroup = (items) => {
    if (disabled) return;
    const keys = items
      .filter((i) => isSuperAdminContext || !i.superAdminOnly)
      .map((i) => i.key);
    const next = new Set([...selected, ...keys]);
    onChange?.(Array.from(next));
  };

  const clearGroup = (items) => {
    if (disabled) return;
    const keys = new Set(items.map((i) => i.key));
    onChange?.(value.filter((p) => !keys.has(p)));
  };

  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No permissions available for this scope.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const groupItems = group.items.filter(
          (i) => isSuperAdminContext || !i.superAdminOnly
        );
        const groupSelected = groupItems.filter((i) => selected.has(i.key)).length;

        return (
          <motion.div
            key={group.group}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl glass border border-white/10 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold">{group.group}</h4>
                <p className="text-[11px] text-muted-foreground">
                  {groupSelected} of {groupItems.length} selected
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => selectGroup(groupItems)}
                  disabled={disabled}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => clearGroup(groupItems)}
                  disabled={disabled}
                >
                  None
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {groupItems.map((item) => {
                const checked = selected.has(item.key);
                return (
                  <label
                    key={item.key}
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-2.5 cursor-pointer transition-colors",
                      "border border-white/5 hover:border-white/15 hover:bg-white/[0.03]",
                      checked && "bg-primary/10 border-primary/30",
                      disabled && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(item.key)}
                      disabled={disabled}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        {item.key}
                      </p>
                    </div>
                    {item.superAdminOnly && (
                      <span className="text-[9px] tracking-widest font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary shrink-0">
                        SUPER
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Check className="h-3 w-3" /> {value.length} permissions selected
      </p>
    </div>
  );
}
