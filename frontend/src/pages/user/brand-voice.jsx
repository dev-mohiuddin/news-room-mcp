import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Mic,
  Plus,
  CheckCircle2,
  Trash2,
  Sparkles,
  Quote,
  Star,
  RefreshCw,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  fetchBrandVoices,
  createBrandVoice,
  activateBrandVoice,
  reExtractBrandVoice,
  deleteBrandVoice,
} from "@/redux/slice/brand-slice";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";

export default function BrandVoicePage() {
  const dispatch = useDispatch();
  const { list, isLoading } = useSelector((s) => s.brand);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    dispatch(fetchBrandVoices());
  }, [dispatch]);

  const onActivate = async (id) => {
    setBusyId(id);
    try {
      await dispatch(activateBrandVoice(id)).unwrap();
      toast.success("Brand voice activated for new articles");
    } catch (err) {
      toast.error(err || "Could not activate");
    } finally {
      setBusyId(null);
    }
  };

  const onReExtract = async (id) => {
    setBusyId(id);
    try {
      await dispatch(reExtractBrandVoice(id)).unwrap();
      toast.success("Voice profile re-extracted");
    } catch (err) {
      toast.error(err || "Re-extract failed");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteBrandVoice(deleteTarget._id)).unwrap();
      toast.success("Profile deleted");
    } catch (err) {
      toast.error(err || "Could not delete");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Style"
        title="Brand Voice"
        subtitle="Train the AI on 3-5 sample articles. Future drafts will speak in your voice."
        actions={
          <GradientButton size="md" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New voice profile
          </GradientButton>
        }
      />

      {isLoading && list.length === 0 ? (
        <ListSkeleton />
      ) : list.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <motion.div
          variants={staggerContainer(0.05)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {list.map((p) => (
            <motion.div key={p._id} variants={staggerItem}>
              <ProfileCard
                profile={p}
                isBusy={busyId === p._id}
                onActivate={() => onActivate(p._id)}
                onReExtract={() => onReExtract(p._id)}
                onDelete={() => setDeleteTarget(p)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <CreateProfileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          dispatch(fetchBrandVoices());
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="The voice profile will be removed permanently."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}

function ProfileCard({ profile, isBusy, onActivate, onReExtract, onDelete }) {
  const p = profile.profile || {};
  return (
    <GlassCard
      className={`p-5 h-full flex flex-col ${
        profile.isActive ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center shadow-lg shrink-0">
            <Mic className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg leading-tight truncate">
                {profile.name}
              </h3>
              {profile.isActive && (
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {profile.samples?.length || 0} samples · extracted{" "}
              {profile.extractedAt
                ? dateFormater(profile.extractedAt, "MMM d")
                : "not yet"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm flex-1">
        {p.toneSummary && (
          <div className="text-muted-foreground italic flex gap-2">
            <Quote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-3">{p.toneSummary}</span>
          </div>
        )}
        {p.voiceTraits?.length ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {p.voiceTraits.slice(0, 5).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
        {!profile.isActive && (
          <Button
            variant="glass"
            size="sm"
            className="flex-1"
            onClick={onActivate}
            disabled={isBusy}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Activate
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onReExtract}
          disabled={isBusy}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </GlassCard>
  );
}

function EmptyState({ onCreate }) {
  return (
    <GlassCard className="p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-full glass border border-white/10 flex items-center justify-center mb-3">
        <Mic className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">No voice profiles yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Paste 3-5 sample articles you wrote previously. The AI will extract
        your tone, sentence rhythm, and signature phrases.
      </p>
      <GradientButton size="md" onClick={onCreate} className="mt-4">
        <Sparkles className="h-4 w-4" /> Create first profile
      </GradientButton>
    </GlassCard>
  );
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <GlassCard key={i} className="p-5 h-44 animate-pulse" />
      ))}
    </div>
  );
}

function CreateProfileDialog({ open, onOpenChange, onSuccess }) {
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [samples, setSamples] = useState([
    { title: "", text: "" },
    { title: "", text: "" },
    { title: "", text: "" },
  ]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setSamples([
      { title: "", text: "" },
      { title: "", text: "" },
      { title: "", text: "" },
    ]);
  };

  const updateSample = (i, key, value) =>
    setSamples((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s))
    );

  const addSample = () => {
    if (samples.length >= 5) {
      toast.error("Maximum 5 samples");
      return;
    }
    setSamples((prev) => [...prev, { title: "", text: "" }]);
  };

  const removeSample = (i) => {
    if (samples.length <= 3) {
      toast.error("Minimum 3 samples required");
      return;
    }
    setSamples((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Profile name required");
      return;
    }
    if (samples.some((s) => (s.text || "").trim().length < 200)) {
      toast.error("Each sample needs at least 200 characters");
      return;
    }
    setBusy(true);
    try {
      await dispatch(
        createBrandVoice({
          name: name.trim(),
          description: description.trim() || undefined,
          samples,
        })
      ).unwrap();
      toast.success("Brand voice created — extracting profile…");
      reset();
      onSuccess?.();
    } catch (err) {
      toast.error(err || "Could not create profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create brand voice profile</DialogTitle>
          <DialogDescription>
            Paste 3-5 sample articles. Each must be at least 200 characters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Profile name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Our Blog Voice"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Short description (optional)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="B2B SaaS, conversational"
                className="mt-1.5"
              />
            </div>
          </div>

          {samples.map((s, i) => (
            <div
              key={i}
              className="p-4 rounded-lg glass border border-white/5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Sample {i + 1}</span>
                {samples.length > 3 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeSample(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Input
                value={s.title}
                onChange={(e) => updateSample(i, "title", e.target.value)}
                placeholder="Sample title (optional)"
                className="text-sm"
              />
              <Textarea
                rows={6}
                value={s.text}
                onChange={(e) => updateSample(i, "text", e.target.value)}
                placeholder="Paste sample article text here…"
                className="text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground tabular-nums text-right">
                {s.text.length} chars
              </p>
            </div>
          ))}

          {samples.length < 5 && (
            <Button variant="glass" size="sm" onClick={addSample}>
              <Plus className="h-3.5 w-3.5" /> Add sample
            </Button>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <GradientButton size="md" onClick={submit} disabled={busy}>
            <Sparkles className="h-4 w-4" />
            {busy ? "Extracting…" : "Create + extract"}
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
