import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Rocket, Eye, FileCheck2 } from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import PublishDialog from "@/components/user/PublishDialog";

export default function PublishStep() {
  const navigate = useNavigate();
  const { articleId, draft, seo, topic } = useSelector((s) => s.wizard);
  const [open, setOpen] = useState(false);

  /**
   * Build the minimal article payload PublishDialog expects. The dialog
   * pulls cmsConnections + handles all publish logic itself; we just
   * hand it the wizard state in the right shape.
   */
  const articleShape = {
    _id: articleId,
    topic,
    seo: {
      metaTitle: seo?.metaTitle,
      metaDescription: seo?.metaDescription,
      slug: seo?.slug,
      tags: seo?.tags,
    },
    contentHtml: draft?.contentHtml,
    wordCount: draft?.wordCount,
    readingTimeMinutes: draft?.readingTimeMinutes,
    status: "draft_ready",
  };

  const checks = [
    { label: "Meta title", ok: Boolean(seo?.metaTitle) },
    { label: "Meta description", ok: Boolean(seo?.metaDescription) },
    { label: "Slug", ok: Boolean(seo?.slug) },
    { label: "Word count > 0", ok: (draft?.wordCount || 0) > 0 },
  ];
  const allChecksOk = checks.every((c) => c.ok);

  return (
    <>
      <GlassCard className="p-4 md:p-6 space-y-4">
        <div>
          <h3 className="font-display text-lg flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Publish
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Pre-publish checklist and CMS destination.
          </p>
        </div>

        {/* Checklist */}
        <ul className="space-y-2">
          {checks.map((c) => (
            <li
              key={c.label}
              className={`flex items-center gap-2 text-sm ${
                c.ok ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>{c.label}</span>
              <span className="ml-auto text-xs">{c.ok ? "OK" : "Missing"}</span>
            </li>
          ))}
        </ul>

        {/* Article preview */}
        <div className="rounded-lg p-4 glass border border-white/5">
          <h4 className="font-display text-base leading-tight">
            {seo?.metaTitle || topic}
          </h4>
          {seo?.metaDescription && (
            <p className="text-sm text-muted-foreground mt-2">
              {seo.metaDescription}
            </p>
          )}
          {seo?.slug && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              /{seo.slug}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            {draft?.wordCount || 0} words · {draft?.readingTimeMinutes || 0} min read
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <GradientButton
            size="md"
            onClick={() => setOpen(true)}
            disabled={!articleId}
          >
            <Rocket className="h-4 w-4" /> Publish to CMS
          </GradientButton>
          <Button
            variant="glass"
            size="md"
            onClick={() => articleId && navigate(`/dashboard/articles/${articleId}`)}
          >
            <Eye className="h-4 w-4" /> Open article detail
          </Button>
        </div>

        {!allChecksOk && (
          <p className="text-xs text-amber-300">
            Some checks are missing. You can still publish as a draft, but
            "Publish now" will require explicit confirmation.
          </p>
        )}
      </GlassCard>

      <PublishDialog
        open={open}
        onOpenChange={setOpen}
        article={articleShape}
      />
    </>
  );
}
