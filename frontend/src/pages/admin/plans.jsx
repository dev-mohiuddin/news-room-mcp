import { useState } from "react";
import { Plus, Check, Edit, Trash2, Crown } from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState(PLANS);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [creating, setCreating] = useState(false);

  const openCreate = () => {
    setCreating(true);
    setEditingPlan({
      id: "",
      name: "",
      price: 0,
      yearlyPrice: 0,
      description: "",
      features: [""],
    });
  };

  const handleSave = (plan) => {
    if (creating) {
      setPlans((p) => [...p, { ...plan, id: plan.id || plan.name.toLowerCase() }]);
    } else {
      setPlans((p) => p.map((x) => (x.id === plan.id ? plan : x)));
    }
    setEditingPlan(null);
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Subscriptions"
        title="Pricing plans"
        subtitle="Create, edit, or retire subscription plans. Price changes apply to new subscribers only."
        actions={
          <GradientButton size="md" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create plan
          </GradientButton>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => {
              setCreating(false);
              setEditingPlan(plan);
            }}
            onDelete={() => setDeletingPlan(plan)}
          />
        ))}
      </div>

      <PlanFormDialog
        open={!!editingPlan}
        onOpenChange={(o) => {
          if (!o) {
            setEditingPlan(null);
            setCreating(false);
          }
        }}
        plan={editingPlan}
        creating={creating}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deletingPlan}
        onOpenChange={(o) => !o && setDeletingPlan(null)}
        title={`Delete ${deletingPlan?.name} plan?`}
        description="Existing subscribers on this plan will keep their access. The plan will not be available for new signups."
        confirmLabel="Delete plan"
        destructive
        onConfirm={() => {
          if (deletingPlan) {
            setPlans((p) => p.filter((x) => x.id !== deletingPlan.id));
          }
          setDeletingPlan(null);
        }}
      />
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete }) {
  return (
    <GlassCard
      hover
      glow={plan.highlight ? "blue" : null}
      className={cn(
        "p-6 h-full flex flex-col relative",
        plan.highlight && "lg:scale-[1.02]"
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest gradient-bg text-white px-3 py-1 rounded-full inline-flex items-center gap-1">
          <Crown className="h-3 w-3" /> Featured
        </span>
      )}
      <h3 className="font-display text-xl">{plan.name}</h3>
      <p className="text-xs text-muted-foreground mt-1 min-h-[2rem]">
        {plan.description}
      </p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-sm text-muted-foreground">$</span>
        <span className="font-display text-4xl">{plan.price}</span>
        <span className="text-sm text-muted-foreground">/mo</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Yearly: <span className="text-foreground">${plan.yearlyPrice}/mo</span>
      </p>

      <ul className="mt-5 space-y-2 text-sm flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 mt-1 text-brand-teal shrink-0" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center gap-2 pt-4 border-t border-white/5">
        <Button variant="glass" size="sm" className="flex-1" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </GlassCard>
  );
}

function PlanFormDialog({ open, onOpenChange, plan, creating, onSave }) {
  const [draft, setDraft] = useState(plan);

  // sync draft when plan changes
  if (plan && (!draft || draft.id !== plan.id)) {
    setDraft(plan);
  }

  if (!draft) return null;

  const setField = (key, value) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setFeature = (idx, value) =>
    setDraft((d) => {
      const features = [...d.features];
      features[idx] = value;
      return { ...d, features };
    });

  const addFeature = () =>
    setDraft((d) => ({ ...d, features: [...d.features, ""] }));

  const removeFeature = (idx) =>
    setDraft((d) => ({
      ...d,
      features: d.features.filter((_, i) => i !== idx),
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-white/10 max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{creating ? "Create plan" : `Edit ${plan.name}`}</DialogTitle>
          <DialogDescription>
            Tweak pricing, limits, and features for this subscription tier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Plan name
              </Label>
              <Input
                value={draft.name}
                onChange={(e) => setField("name", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Slug
              </Label>
              <Input
                value={draft.id}
                onChange={(e) => setField("id", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <Textarea
              value={draft.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
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
                value={draft.price}
                onChange={(e) => setField("price", Number(e.target.value))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Yearly price ($/mo)
              </Label>
              <Input
                type="number"
                value={draft.yearlyPrice}
                onChange={(e) =>
                  setField("yearlyPrice", Number(e.target.value))
                }
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg glass border border-white/5 p-3">
            <div>
              <p className="text-sm font-medium">Highlight as featured</p>
              <p className="text-xs text-muted-foreground">
                Adds the gradient ring + "Most Popular" badge.
              </p>
            </div>
            <Switch
              checked={!!draft.highlight}
              onCheckedChange={(v) => setField("highlight", v)}
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Features
            </Label>
            <div className="mt-1.5 space-y-2">
              {draft.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={f}
                    onChange={(e) => setFeature(i, e.target.value)}
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
              <Button type="button" variant="glass" size="sm" onClick={addFeature}>
                <Plus className="h-3.5 w-3.5" /> Add feature
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <GradientButton size="sm" onClick={() => onSave(draft)}>
            {creating ? "Create plan" : "Save changes"}
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
