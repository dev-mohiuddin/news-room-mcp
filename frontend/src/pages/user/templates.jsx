import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Plus,
  Copy,
  Edit,
  Trash2,
  FileText,
  Clock,
  LayoutTemplate,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/redux/slice/template-slice";

const EMPTY_DRAFT = {
  id: "",
  name: "",
  description: "",
  category: "General",
  targetWordCount: 1500,
};

export default function TemplatesPage() {
  const dispatch = useDispatch();
  const { list, isLoading, isMutating } = useSelector((s) => s.templates);

  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchTemplates({ perPage: 50 }));
  }, [dispatch]);

  const openCreate = () => {
    setCreating(true);
    setEditTarget({ ...EMPTY_DRAFT });
  };

  const handleSave = async (draft) => {
    const payload = {
      name: draft.name?.trim(),
      description: draft.description?.trim() || "",
      category: draft.category?.trim() || "General",
      targetWordCount: Number(draft.targetWordCount) || 1500,
    };
    if (!payload.name) {
      toast.error("Name is required");
      return;
    }

    if (creating) {
      const res = await dispatch(createTemplate(payload));
      if (createTemplate.fulfilled.match(res)) {
        toast.success("Template created");
        setEditTarget(null);
        setCreating(false);
      } else {
        toast.error(res.payload || "Could not create template");
      }
    } else {
      const res = await dispatch(updateTemplate({ id: draft.id, data: payload }));
      if (updateTemplate.fulfilled.match(res)) {
        toast.success("Template updated");
        setEditTarget(null);
      } else {
        toast.error(res.payload || "Could not update template");
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await dispatch(deleteTemplate(deleteTarget.id));
    if (deleteTemplate.fulfilled.match(res)) {
      toast.success("Template deleted");
    } else {
      toast.error(res.payload || "Could not delete template");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Templates"
        subtitle="Save and reuse article prompts and outlines. Start new articles faster."
        actions={
          <GradientButton size="md" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New template
          </GradientButton>
        }
      />

      {isLoading && list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      ) : list.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <LayoutTemplate className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium mt-3">No templates yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first template to speed up new article generation.
          </p>
          <GradientButton size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create template
          </GradientButton>
        </GlassCard>
      ) : (
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {list.map((t) => (
            <motion.div key={t.id} variants={staggerItem}>
              <GlassCard hover glow="violet" className="p-5 h-full flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                    <LayoutTemplate className="h-4 w-4 text-white" />
                  </div>
                  <Badge variant="glass" className="text-[10px]">
                    {t.category}
                  </Badge>
                </div>

                <h3 className="font-display text-lg mt-4 leading-tight">
                  {t.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 flex-1">
                  {t.description || "No description"}
                </p>

                <div className="flex items-center gap-3 mt-4 text-[11px] text-muted-foreground tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> ~{t.targetWordCount}w
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Copy className="h-3 w-3" /> {t.uses} uses
                  </span>
                  {t.lastUsedAt && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {dateFormater(t.lastUsedAt, "MMM d")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  <Button
                    variant="gradient"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      toast.success(
                        "Open New Article — template will be applied there."
                      )
                    }
                  >
                    Use template
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setCreating(false);
                      setEditTarget({ ...t });
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Edit / Create dialog */}
      <TemplateDialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) {
            setEditTarget(null);
            setCreating(false);
          }
        }}
        template={editTarget}
        creating={creating}
        loading={isMutating}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This template will be permanently removed. Articles created from it are not affected."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function TemplateDialog({ open, onOpenChange, template, creating, loading, onSave }) {
  const [draft, setDraft] = useState(template || EMPTY_DRAFT);

  useEffect(() => {
    setDraft(template || EMPTY_DRAFT);
  }, [template]);

  if (!template) return null;
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle>{creating ? "Create template" : "Edit template"}</DialogTitle>
          <DialogDescription>
            Define the structure and target length for this article template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Name
            </Label>
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              className="mt-1.5"
              placeholder="e.g. Listicle (Top 10)"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Category
            </Label>
            <Input
              value={draft.category}
              onChange={(e) => set("category", e.target.value)}
              className="mt-1.5"
              placeholder="e.g. List, Tutorial, Review"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Description / Prompt
            </Label>
            <Textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="mt-1.5"
              placeholder="Describe the structure, sections, and tone…"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Target word count
            </Label>
            <Input
              type="number"
              min={200}
              max={6000}
              value={draft.targetWordCount}
              onChange={(e) => set("targetWordCount", e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <GradientButton onClick={() => onSave(draft)} disabled={loading}>
            {loading ? "Saving…" : creating ? "Create" : "Save changes"}
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
