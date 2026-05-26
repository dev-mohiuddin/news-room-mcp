import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Rocket, Calendar, Globe, ImageIcon, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import GradientButton from "@/components/shared/GradientButton";
import { fetchCmsConnections } from "@/redux/slice/cms-slice";
import { publishArticle } from "@/redux/slice/article-slice";
import { hasPermission } from "@/lib/permissions";
import ImagePickerDialog from "@/components/user/ImagePickerDialog";

/**
 * Publish dialog — picks a CMS connection, draft/publish/schedule mode,
 * and dispatches the publish thunk.
 *
 *  - Default mode: Draft (always allowed)
 *  - Publish-now mode: requires `tenant.article:approve`
 *  - Schedule mode: requires `tenant.article:approve` + future ISO ts
 */
export default function PublishDialog({ open, onOpenChange, article }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const { connections } = useSelector((s) => s.cms);

  const canApprove = hasPermission(user, "tenant.article:approve");

  const [cmsId, setCmsId] = useState("");
  const [mode, setMode] = useState("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  const featuredImage = article?.featuredImage;
  const hasImage = !!featuredImage?.url;

  /* Load CMS list when dialog opens */
  useEffect(() => {
    if (open) dispatch(fetchCmsConnections());
  }, [open, dispatch]);

  /* Pre-select default connection */
  useEffect(() => {
    if (!cmsId && connections?.length) {
      const def = connections.find((c) => c.isDefault) || connections[0];
      setCmsId(def._id);
    }
  }, [connections, cmsId]);

  const submit = async () => {
    if (!cmsId) {
      toast.error("Pick a CMS connection");
      return;
    }
    if (mode === "schedule") {
      if (!scheduledAt) {
        toast.error("Pick a future date and time");
        return;
      }
      const when = new Date(scheduledAt);
      if (when.getTime() <= Date.now()) {
        toast.error("Scheduled time must be in the future");
        return;
      }
    }

    const payload = { cmsConnectionId: cmsId };
    if (mode === "publish") payload.confirmAutoPublish = true;
    if (mode === "schedule") payload.scheduledAt = new Date(scheduledAt).toISOString();

    setBusy(true);
    try {
      const result = await dispatch(
        publishArticle({ id: article._id, payload })
      ).unwrap();
      const url = result?.data?.cmsPostUrl;
      const idempotent = result?.data?.idempotent;

      if (idempotent && url) {
        toast.info("Already published. Opening live post.");
        window.open(url, "_blank", "noopener");
      } else if (mode === "draft") {
        toast.success("Sent to CMS as draft");
      } else if (mode === "publish") {
        toast.success("Published live!");
        if (url) window.open(url, "_blank", "noopener");
      } else {
        toast.success("Scheduled");
      }
      onOpenChange(false);
      navigate(`/dashboard/articles/${article._id}`, { replace: true });
    } catch (err) {
      toast.error(err || "Publish failed");
    } finally {
      setBusy(false);
    }
  };

  const noConnections = !connections?.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish article</DialogTitle>
          <DialogDescription>
            Send "{article?.seo?.metaTitle || article?.topic}" to a connected
            CMS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Featured image picker */}
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Featured image
            </Label>
            {hasImage ? (
              <div className="mt-1.5 flex items-center gap-3 p-2 glass border border-white/10 rounded-lg">
                <img
                  src={featuredImage.url}
                  alt={featuredImage.alt || ""}
                  className="h-14 w-20 rounded object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {featuredImage.alt || "Featured image set"}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    via {featuredImage.source}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImagePickerOpen(true)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="mt-1.5 p-3 glass border border-amber-500/30 bg-amber-500/5 rounded-lg flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs flex-1">
                  No featured image set. Posts often look better with one.
                </p>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setImagePickerOpen(true)}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Pick image
                </Button>
              </div>
            )}
          </div>

          {/* CMS picker */}
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Publish to
            </Label>
            {noConnections ? (
              <div className="mt-1.5 p-3 rounded-lg glass border border-amber-500/30 bg-amber-500/5 text-xs">
                No CMS connections yet. Add one on the{" "}
                <a
                  href="/dashboard/cms"
                  className="text-primary hover:underline"
                >
                  CMS page
                </a>{" "}
                first.
              </div>
            ) : (
              <Select value={cmsId} onValueChange={setCmsId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Pick a connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      <span className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        {c.label || c.siteUrl}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Mode picker */}
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Publish mode
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
              <ModeOption
                v="draft"
                title="Draft"
                desc="Save as CMS draft"
                active={mode === "draft"}
                onClick={() => setMode("draft")}
              />
              <ModeOption
                v="publish"
                title="Publish now"
                desc={canApprove ? "Go live immediately" : "Requires approval"}
                active={mode === "publish"}
                disabled={!canApprove}
                onClick={() => canApprove && setMode("publish")}
              />
              <ModeOption
                v="schedule"
                title="Schedule"
                desc={canApprove ? "Pick date & time" : "Requires approval"}
                active={mode === "schedule"}
                disabled={!canApprove}
                onClick={() => canApprove && setMode("schedule")}
              />
            </div>
          </div>

          {mode === "schedule" && (
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Schedule date & time
              </Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1.5"
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <GradientButton
            size="md"
            onClick={submit}
            disabled={busy || noConnections}
          >
            <Rocket className="h-4 w-4" />
            {busy
              ? "Publishing…"
              : mode === "draft"
                ? "Send as draft"
                : mode === "publish"
                  ? "Publish now"
                  : "Schedule publish"}
          </GradientButton>
        </DialogFooter>
      </DialogContent>

      <ImagePickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        article={article}
      />
    </Dialog>
  );
}

function ModeOption({ title, desc, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-3 rounded-lg text-left transition-all ${
        active
          ? "glass border border-primary/40 ring-2 ring-primary/20"
          : "glass border border-white/10 hover:border-white/20"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
    </button>
  );
}
