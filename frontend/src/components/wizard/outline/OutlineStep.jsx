import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ListOrdered,
  GripVertical,
  Trash2,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  runStageApi,
  approveStageApi,
  patchOutlineApi,
  appendOutlineSectionApi,
  removeOutlineSectionApi,
  regenerateStageApi,
  retryStageApi,
} from "@/api/article/wizard";
import { wizardActions } from "@/redux/slice/wizard-slice";

const TONES = ["Professional", "Casual", "Journalistic", "Academic"];
const WORD_COUNTS = [500, 1000, 1500, 2000, 3000];

export default function OutlineStep({ onAdvance }) {
  const dispatch = useDispatch();
  const {
    articleId,
    stages,
    outline,
    tone,
    targetWordCount,
  } = useSelector((s) => s.wizard);
  const stageStatus = stages.outline?.status || "pending";
  const failureReason = stages.outline?.failureReason;
  const retryCount = stages.outline?.retryCount || 0;

  const [submitting, setSubmitting] = useState(false);
  /**
   * Auto-start guard. We key by `${articleId}:outline` and use a
   * `useRef(Set)` so it survives StrictMode double-mount, route
   * remounts, and out-of-order Redux updates. Without this two
   * concurrent `runStageApi` calls race the server's CAS table
   * (issue: "Stage 'outline' is not currently 'pending' (CAS lost)").
   */
  const startedKeysRef = useRef(new Set());

  /* Auto-start the outline stage when entering this step from research approval. */
  useEffect(() => {
    const researchStatus = stages.research?.status;
    if (
      !articleId ||
      stageStatus !== "pending" ||
      researchStatus !== "approved"
    ) return;
    const key = `${articleId}:outline`;
    if (startedKeysRef.current.has(key)) return;
    startedKeysRef.current.add(key);
    runStageApi(articleId, "outline").catch((err) => {
      // Allow a future re-attempt only on real failure (not CAS race).
      if (err?.statusCode !== 409) {
        startedKeysRef.current.delete(key);
      }
      toast.error(err?.message || "Could not start outline stage");
    });
  }, [articleId, stageStatus, stages.research?.status]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = outline.sections.findIndex((s, i) => `s-${i}` === active.id);
    const newIdx = outline.sections.findIndex((s, i) => `s-${i}` === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const newOrder = arrayMove(outline.sections, oldIdx, newIdx);
    dispatch(wizardActions.setOutlineOrder(newOrder));
    try {
      await patchOutlineApi(articleId, { outline: newOrder });
      dispatch(wizardActions.markOutlineClean());
    } catch (err) {
      toast.error("Could not save new order — reverting.");
      dispatch(wizardActions.setOutlineOrder(outline.sections));
    }
  };

  const handleRename = async (idx, heading) => {
    if (!heading.trim()) {
      toast.error("Heading is required");
      return;
    }
    dispatch(wizardActions.renameSection({ idx, heading }));
    try {
      const next = outline.sections.map((s, i) =>
        i === idx ? { ...s, heading } : s
      );
      await patchOutlineApi(articleId, { outline: next });
      dispatch(wizardActions.markOutlineClean());
    } catch (err) {
      toast.error("Could not rename");
    }
  };

  const handleAdd = async () => {
    if (outline.sections.length >= 20) {
      toast.error("Maximum 20 sections");
      return;
    }
    const defaultEstimate = Math.round(targetWordCount / 5 / 50) * 50 || 250;
    const newSection = {
      heading: "New section",
      subPoints: [],
      estimatedWordCount: defaultEstimate,
    };
    try {
      const res = await appendOutlineSectionApi(articleId, newSection);
      dispatch(
        wizardActions.setOutlineOrder(res?.data?.outline || [...outline.sections, newSection])
      );
    } catch (err) {
      toast.error(err?.message || "Could not add section");
    }
  };

  const handleRemove = async (idx) => {
    if (!window.confirm("Remove this section?")) return;
    try {
      const res = await removeOutlineSectionApi(articleId, idx);
      dispatch(wizardActions.setOutlineOrder(res?.data?.outline || outline.sections.filter((_, i) => i !== idx)));
    } catch (err) {
      toast.error(err?.message || "Could not remove");
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm("Regenerate outline? This consumes a quota slot.")) return;
    setSubmitting(true);
    try {
      await regenerateStageApi(articleId, "outline");
      dispatch(wizardActions.stageReset({ stage: "outline" }));
      toast.success("Regenerating outline…");
    } catch (err) {
      toast.error(err?.message || "Regeneration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setSubmitting(true);
    try {
      await retryStageApi(articleId, "outline");
      toast.success("Retrying outline…");
    } catch (err) {
      toast.error(err?.message || "Retry failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (outline.sections.length === 0) {
      toast.error("Add at least one section");
      return;
    }
    setSubmitting(true);
    try {
      // Persist any pending tone/word-count changes
      await patchOutlineApi(articleId, {
        outline: outline.sections,
        tone,
        targetWordCount,
      });
      await approveStageApi(articleId, "outline");
      dispatch(wizardActions.stageApproved({ stage: "outline" }));
      onAdvance?.();
    } catch (err) {
      toast.error(err?.message || "Could not advance");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassCard className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg flex items-center gap-2">
            {stageStatus === "running" && <Loader2 className="h-4 w-4 animate-spin text-sky-400" />}
            <ListOrdered className="h-4 w-4 text-primary" /> Outline
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {stageStatus === "running"
              ? "Building the outline from your research brief…"
              : stageStatus === "awaiting_approval"
              ? "Drag to reorder, click headings to rename, add or remove sections."
              : stageStatus === "approved"
              ? "Approved. Move to draft."
              : stageStatus === "failed"
              ? "Outline generation failed."
              : "Outline pending."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stageStatus === "approved" && (
            <Button variant="glass" size="sm" onClick={handleRegenerate} disabled={submitting}>
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </Button>
          )}
          {stageStatus === "failed" && retryCount < 3 && (
            <Button variant="glass" size="sm" onClick={handleRetry} disabled={submitting}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry ({3 - retryCount} left)
            </Button>
          )}
        </div>
      </div>

      {failureReason && (
        <div className="flex items-start gap-2 text-xs p-2 rounded glass border border-red-400/30 bg-red-500/5">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
          <span className="text-red-300">{failureReason}</span>
        </div>
      )}

      {/* Tone & word count selectors */}
      {(stageStatus === "awaiting_approval" || stageStatus === "approved") && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Tone</Label>
            <Select
              value={tone}
              onValueChange={(v) => dispatch(wizardActions.setTone(v))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Word count</Label>
            <Select
              value={String(targetWordCount)}
              onValueChange={(v) => dispatch(wizardActions.setTargetWordCount(Number(v)))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORD_COUNTS.map((w) => (
                  <SelectItem key={w} value={String(w)}>{w.toLocaleString()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Sortable list */}
      {outline.sections.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={outline.sections.map((_, i) => `s-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {outline.sections.map((section, idx) => (
                <SortableSection
                  key={`s-${idx}`}
                  id={`s-${idx}`}
                  section={section}
                  index={idx}
                  onRename={(heading) => handleRename(idx, heading)}
                  onRemove={() => handleRemove(idx)}
                  editable={stageStatus === "awaiting_approval"}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {stageStatus === "awaiting_approval" && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="glass"
            size="sm"
            onClick={handleAdd}
            disabled={outline.sections.length >= 20}
          >
            <Plus className="h-3.5 w-3.5" /> Add section
          </Button>
          <GradientButton
            size="md"
            onClick={handleContinue}
            disabled={outline.sections.length === 0 || submitting}
          >
            Continue to draft →
          </GradientButton>
        </div>
      )}
    </GlassCard>
  );
}

function SortableSection({ id, section, index, onRename, onRemove, editable }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const [editing, setEditing] = useState(false);
  const [draftHeading, setDraftHeading] = useState(section.heading);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-3 rounded-lg glass border border-white/10"
    >
      {editable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing mt-0.5"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <span className="text-xs font-bold text-primary tabular-nums mt-1">{index + 1}</span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            value={draftHeading}
            onChange={(e) => setDraftHeading(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (draftHeading.trim() && draftHeading !== section.heading) {
                onRename(draftHeading.trim());
              } else {
                setDraftHeading(section.heading);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.target.blur();
              if (e.key === "Escape") {
                setDraftHeading(section.heading);
                setEditing(false);
              }
            }}
            autoFocus
            className="bg-transparent border-white/10"
          />
        ) : (
          <button
            type="button"
            onClick={() => editable && setEditing(true)}
            className={editable ? "text-sm font-medium text-left hover:text-primary" : "text-sm font-medium"}
          >
            {section.heading}
          </button>
        )}
        {section.subPoints?.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {section.subPoints.map((sp, i) => (
              <li key={i} className="text-xs text-muted-foreground">• {sp}</li>
            ))}
          </ul>
        )}
        <span className="text-[10px] text-muted-foreground mt-1 inline-block">
          ~{section.estimatedWordCount} words
        </span>
      </div>
      {editable && (
        <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  );
}
