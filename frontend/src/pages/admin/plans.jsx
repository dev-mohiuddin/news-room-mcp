import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Check, Edit, Trash2, Crown, Lock, Power } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  fetchAdminPlans,
  createPlan,
  updatePlan,
  setPlanActive,
  deletePlan,
} from "@/redux/slice/plan-slice";

const EMPTY_DRAFT = {
  code: "",
  displayName: "",
  description: "",
  monthlyPriceUsd: 0,
  yearlyPriceUsd: 0,
  articleLimit: 10,
  teamMembers: 1,
  features: [],
  badge: "",
  highlight: false,
  cta: "",
  isActive: true,
  sortOrder: 0,
  stripePriceIdMonthly: "",
  stripePriceIdYearly: "",
};

export default function AdminPlansPage() {
  const dispatch = useDispatch();
  const plans = useSelector((s) => s.plans.adminList);
  const isLoading = useSelector((s) => s.plans.isLoading);
  const isMutating = useSelector((s) => s.plans.isMutating);

  const [editing, setEditing] = useState(null); // plan being edited / null
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminPlans());
  }, [dispatch]);

  const sorted = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          (a.monthlyPriceCents ?? 0) - (b.monthlyPriceCents ?? 0)
      ),
    [plans]
  );

  const openCreate = () => {
    setCreating(true);
    setEditing({ ...EMPTY_DRAFT });
  };

  const openEdit = (plan) => {
    setCreating(false);
    setEditing({
      _id: plan._id,
      code: plan.code,
      displayName: plan.displayName,
      description: plan.description || "",
      monthlyPriceUsd: (plan.monthlyPriceCents ?? 0) / 100,
      yearlyPriceUsd: (plan.yearlyPriceCents ?? 0) / 100,
      articleLimit: plan.articleLimit,
      teamMembers: plan.teamMembers,
      features: plan.features || [],
      badge: plan.badge || "",
      highlight: !!plan.highlight,
      cta: plan.cta || "",
      isActive: !!plan.isActive,
      sortOrder: plan.sortOrder ?? 0,
      isSystem: !!plan.isSystem,
      stripePriceIdMonthly: plan.stripePriceIdMonthly || "",
      stripePriceIdYearly: plan.stripePriceIdYearly || "",
    });
  };

  const handleSave = async (draft) => {
    const payload = {
      displayName: draft.displayName.trim(),
      description: draft.description.trim(),
      monthlyPriceCents: Math.round(Number(draft.monthlyPriceUsd) * 100),
      yearlyPriceCents: Math.round(Number(draft.yearlyPriceUsd) * 100),
      articleLimit: Math.trunc(Number(draft.articleLimit)),
      teamMembers: Math.trunc(Number(draft.teamMembers)),
      features: (draft.features || [])
        .map((f) => ({
          key: f.key || null,
          label: typeof f === "string" ? f : f.label,
          included: f.included !== false,
        }))
        .filter((f) => f.label && f.label.trim()),
      badge: draft.badge?.trim() || null,
      highlight: !!draft.highlight,
      cta: draft.cta?.trim() || null,
      isActive: !!draft.isActive,
      sortOrder: Math.trunc(Number(draft.sortOrder) || 0),
      stripePriceIdMonthly: draft.stripePriceIdMonthly?.trim() || null,
      stripePriceIdYearly: draft.stripePriceIdYearly?.trim() || null,
    };

    if (creating) {
      const code = draft.code.trim().toLowerCase();
      if (!code) return toast.error("Plan code is required");
      const res = await dispatch(createPlan({ ...payload, code }));
      if (createPlan.fulfilled.match(res)) {
        toast.success(`Plan '${payload.displayName}' created`);
        setEditing(null);
        setCreating(false);
      } else {
        toast.error(res.payload || "Could not create plan");
      }
      return;
    }

    const res = await dispatch(updatePlan({ id: draft._id, payload }));
    if (updatePlan.fulfilled.match(res)) {
      toast.success(`Plan '${payload.displayName}' updated`);
      setEditing(null);
    } else {
      toast.error(res.payload || "Could not update plan");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await dispatch(deletePlan(deleteTarget._id));
    if (deletePlan.fulfilled.match(res)) {
      toast.success(`Plan '${deleteTarget.displayName}' deleted`);
    } else {
      toast.error(res.payload || "Could not delete plan");
    }
    setDeleteTarget(null);
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    const res = await dispatch(
      setPlanActive({
        id: toggleTarget._id,
        isActive: !toggleTarget.isActive,
      })
    );
    if (setPlanActive.fulfilled.match(res)) {
      toast.success(
        toggleTarget.isActive ? "Plan deactivated" : "Plan activated"
      );
    } else {
      toast.error(res.payload || "Could not toggle plan");
    }
    setToggleTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Subscriptions"
        title="Pricing plans"
        subtitle="Create, edit, or retire plans. Price changes apply to new subscribers only."
        actions={
          <GradientButton size="md" onClick={openCreate} disabled={isMutating}>
            <Plus className="h-4 w-4" /> Create plan
          </GradientButton>
        }
      />

      {isLoading && plans.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassCard key={i} className="p-6 h-[380px] animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <p className="text-muted-foreground">
            No plans yet. The system seeder should create defaults on backend boot.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {sorted.map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              onEdit={() => openEdit(plan)}
              onDelete={() => setDeleteTarget(plan)}
              onToggle={() => setToggleTarget(plan)}
            />
          ))}
        </div>
      )}

      <PlanFormDialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setCreating(false);
          }
        }}
        draft={editing}
        creating={creating}
        onSubmit={handleSave}
        isSubmitting={isMutating}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.displayName}?`}
        description={
          deleteTarget?.isSystem
            ? "System plans cannot be deleted. Use deactivate instead."
            : "Existing subscribers prevent deletion. The plan will be removed only if no active subscriptions reference it."
        }
        confirmLabel="Delete plan"
        destructive
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={`${toggleTarget?.isActive ? "Deactivate" : "Activate"} ${
          toggleTarget?.displayName
        }?`}
        description={
          toggleTarget?.isActive
            ? "Existing subscribers keep their access. The plan will be hidden from new signups."
            : "The plan will be visible on the pricing page and available for new signups."
        }
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        onConfirm={handleToggle}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Plan Card
 * ────────────────────────────────────────────────────────── */
function PlanCard({ plan, onEdit, onDelete, onToggle }) {
  const limitLabel =
    plan.articleLimit === -1 ? "Unlimited" : `${plan.articleLimit}/mo`;
  const teamLabel =
    plan.teamMembers === -1 ? "Unlimited team" : `${plan.teamMembers} user${plan.teamMembers === 1 ? "" : "s"}`;

  return (
    <GlassCard
      hover
      glow={plan.highlight ? "blue" : null}
      className={cn(
        "p-6 h-full flex flex-col relative",
        plan.highlight && "lg:scale-[1.02]",
        !plan.isActive && "opacity-70"
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest gradient-bg text-white px-3 py-1 rounded-full inline-flex items-center gap-1">
          <Crown className="h-3 w-3" /> Featured
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-xl">{plan.displayName}</h3>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5 font-mono">
            {plan.code}
          </p>
        </div>
        {plan.isSystem ? (
          <Badge variant="outline" className="text-[10px]">
            <Lock className="h-3 w-3" /> System
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            Custom
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2 min-h-[2rem] line-clamp-2">
        {plan.description || "—"}
      </p>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-sm text-muted-foreground">$</span>
        <span className="font-display text-3xl">
          {Number(plan.monthlyPriceUsd).toFixed(0)}
        </span>
        <span className="text-sm text-muted-foreground">/mo</span>
      </div>
      {plan.yearlyPriceUsd > 0 && (
        <p className="text-xs text-muted-foreground">
          Yearly:{" "}
          <span className="text-foreground">
            ${(plan.yearlyPriceUsd / 12).toFixed(0)}/mo
          </span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-[10px]">
          {limitLabel}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {teamLabel}
        </Badge>
        {!plan.isActive && (
          <Badge variant="destructive" className="text-[10px]">
            Inactive
          </Badge>
        )}
        {(plan.monthlyPriceCents > 0 || plan.yearlyPriceCents > 0) && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              plan.stripePriceIdMonthly && plan.stripePriceIdYearly
                ? "text-emerald-400 border-emerald-500/30"
                : plan.stripePriceIdMonthly || plan.stripePriceIdYearly
                ? "text-amber-400 border-amber-500/30"
                : "text-muted-foreground"
            )}
            title="Stripe price IDs configured for this plan"
          >
            {plan.stripePriceIdMonthly && plan.stripePriceIdYearly
              ? "Stripe ✓"
              : plan.stripePriceIdMonthly || plan.stripePriceIdYearly
              ? "Stripe partial"
              : "Stripe ✗"}
          </Badge>
        )}
      </div>

      <ul className="mt-4 space-y-2 text-sm flex-1">
        {(plan.features || []).slice(0, 5).map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 mt-1 text-brand-teal shrink-0" />
            <span className="text-muted-foreground line-clamp-1">
              {f.label}
            </span>
          </li>
        ))}
        {(plan.features || []).length > 5 && (
          <li className="text-xs text-muted-foreground">
            +{plan.features.length - 5} more
          </li>
        )}
      </ul>

      <div className="mt-6 flex items-center gap-2 pt-4 border-t border-white/5">
        <Button variant="glass" size="sm" className="flex-1" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title={plan.isActive ? "Deactivate" : "Activate"}
          className={cn(
            "transition",
            plan.isActive
              ? "text-emerald-400 hover:bg-emerald-500/10"
              : "text-muted-foreground hover:bg-white/5"
          )}
        >
          <Power className="h-4 w-4" />
        </Button>
        {!plan.isSystem && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete plan"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Edit / Create dialog
 * ────────────────────────────────────────────────────────── */
function PlanFormDialog({
  open,
  onOpenChange,
  draft,
  creating,
  onSubmit,
  isSubmitting,
}) {
  const [local, setLocal] = useState(draft);

  // Sync when a different plan is opened
  useEffect(() => {
    if (open && draft) setLocal(draft);
  }, [open, draft]);

  if (!local) return null;

  const setField = (key, value) =>
    setLocal((d) => ({ ...d, [key]: value }));

  const setFeature = (idx, key, value) =>
    setLocal((d) => {
      const features = (d.features || []).map((f, i) =>
        i === idx ? { ...f, [key]: value } : f
      );
      return { ...d, features };
    });

  const addFeature = () =>
    setLocal((d) => ({
      ...d,
      features: [...(d.features || []), { label: "", included: true, key: null }],
    }));

  const removeFeature = (idx) =>
    setLocal((d) => ({
      ...d,
      features: (d.features || []).filter((_, i) => i !== idx),
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!local.displayName?.trim()) {
      toast.error("Display name is required");
      return;
    }
    onSubmit(local);
  };

  const isSystem = !!local.isSystem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {creating ? "Create plan" : `Edit ${local.displayName || local.code}`}
          </DialogTitle>
          <DialogDescription>
            Tweak pricing, limits, and marketing copy. Price changes apply to
            new subscribers only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Display name
              </Label>
              <Input
                value={local.displayName}
                onChange={(e) => setField("displayName", e.target.value)}
                maxLength={80}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Code (slug)
              </Label>
              <Input
                value={local.code}
                onChange={(e) => setField("code", e.target.value)}
                disabled={!creating}
                placeholder="lowercase_alnum"
                className="mt-1.5 font-mono"
                required={creating}
              />
              {!creating && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Code is immutable.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <Textarea
              value={local.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              maxLength={500}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Monthly price ($)
              </Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={local.monthlyPriceUsd}
                onChange={(e) => setField("monthlyPriceUsd", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Yearly price ($/yr)
              </Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={local.yearlyPriceUsd}
                onChange={(e) => setField("yearlyPriceUsd", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Article limit / month (-1 = unlimited)
              </Label>
              <Input
                type="number"
                min={-1}
                step={1}
                value={local.articleLimit}
                onChange={(e) => setField("articleLimit", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Team members (-1 = unlimited)
              </Label>
              <Input
                type="number"
                min={-1}
                step={1}
                value={local.teamMembers}
                onChange={(e) => setField("teamMembers", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Badge (optional)
              </Label>
              <Input
                value={local.badge || ""}
                onChange={(e) => setField("badge", e.target.value)}
                maxLength={40}
                placeholder="Most popular"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                CTA label
              </Label>
              <Input
                value={local.cta || ""}
                onChange={(e) => setField("cta", e.target.value)}
                maxLength={60}
                placeholder="Start free trial"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg glass border border-white/5 p-3">
              <div>
                <p className="text-sm font-medium">Highlight as featured</p>
                <p className="text-[10px] text-muted-foreground">
                  Adds gradient ring on cards.
                </p>
              </div>
              <Switch
                checked={!!local.highlight}
                onCheckedChange={(v) => setField("highlight", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg glass border border-white/5 p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-[10px] text-muted-foreground">
                  Shown on pricing page.
                </p>
              </div>
              <Switch
                checked={!!local.isActive}
                onCheckedChange={(v) => setField("isActive", v)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Sort order
            </Label>
            <Input
              type="number"
              step={1}
              value={local.sortOrder}
              onChange={(e) => setField("sortOrder", e.target.value)}
              className="mt-1.5 max-w-[160px]"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Lower values render first on pricing & admin lists.
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Features
            </Label>
            <div className="mt-1.5 space-y-2">
              {(local.features || []).map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={f.label || ""}
                    onChange={(e) => setFeature(i, "label", e.target.value)}
                    placeholder="e.g. 50 articles / month"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(i)}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={addFeature}
              >
                <Plus className="h-3.5 w-3.5" /> Add feature
              </Button>
            </div>
          </div>

          {isSystem && !creating && (
            <div className="rounded-lg p-3 border border-amber-500/30 bg-amber-500/5 text-xs text-amber-400">
              This is a system plan. Code is locked and the plan cannot be
              deleted, but every other field is editable.
            </div>
          )}

          {/* Stripe linkage */}
          <div className="rounded-lg p-4 border border-white/10 bg-white/[0.02] space-y-3">
            <div className="flex items-start gap-2">
              <div className="h-7 w-7 rounded-md bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-violet-300">$</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Stripe linkage</p>
                <p className="text-[10px] text-muted-foreground">
                  Paste the Stripe Price IDs for this plan from the Stripe
                  dashboard → Products. Until both are set, checkout for this
                  plan returns{" "}
                  <code className="font-mono">PLAN_PRICE_NOT_CONFIGURED</code>{" "}
                  and falls back to a friendly notice.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Monthly price ID
                </Label>
                <Input
                  value={local.stripePriceIdMonthly || ""}
                  onChange={(e) =>
                    setField("stripePriceIdMonthly", e.target.value)
                  }
                  placeholder="price_1Abc…"
                  maxLength={120}
                  className="mt-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Yearly price ID
                </Label>
                <Input
                  value={local.stripePriceIdYearly || ""}
                  onChange={(e) =>
                    setField("stripePriceIdYearly", e.target.value)
                  }
                  placeholder="price_1Abc…"
                  maxLength={120}
                  className="mt-1.5 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border",
                  local.stripePriceIdMonthly
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    local.stripePriceIdMonthly
                      ? "bg-emerald-400"
                      : "bg-zinc-500"
                  )}
                />
                Monthly{" "}
                {local.stripePriceIdMonthly ? "linked" : "not linked"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border",
                  local.stripePriceIdYearly
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    local.stripePriceIdYearly
                      ? "bg-emerald-400"
                      : "bg-zinc-500"
                  )}
                />
                Yearly {local.stripePriceIdYearly ? "linked" : "not linked"}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <GradientButton size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : creating
                ? "Create plan"
                : "Save changes"}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
