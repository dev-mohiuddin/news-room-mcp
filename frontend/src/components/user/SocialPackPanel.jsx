import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import {
  Sparkles,
  MessageCircle,
  Megaphone,
  Camera,
  Copy,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { generateSocialPackApi } from "@/api/article/article";
import { fetchArticleById } from "@/redux/slice/article-slice";
import { dateFormater } from "@/lib/utils";

/**
 * Social Pack Panel — Phase B (B4)
 *
 *  Shows existing twitterThread / linkedinPost / instagramCaption from
 *  `article.socialPosts`, with a Generate / Regenerate button.
 */
export default function SocialPackPanel({ article }) {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const pack = article?.socialPosts;

  const onGenerate = async () => {
    if (!article) return;
    setBusy(true);
    try {
      const res = await generateSocialPackApi(article._id);
      if (res?.success) {
        toast.success("Social pack generated");
        dispatch(fetchArticleById(article._id));
      } else {
        toast.error(res?.message || "Could not generate social pack");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!pack || !pack.generatedAt) {
    return (
      <GlassCard className="p-8 text-center">
        <Sparkles className="h-8 w-8 mx-auto text-primary" />
        <h4 className="font-display text-lg mt-2">No social pack yet</h4>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Generate a Twitter thread, a LinkedIn post, and an Instagram caption
          tailored to this article.
        </p>
        <GradientButton size="md" className="mt-4" onClick={onGenerate} disabled={busy}>
          <Sparkles className="h-4 w-4" />
          {busy ? "Generating…" : "Generate social pack"}
        </GradientButton>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Generated {dateFormater(pack.generatedAt, "MMM d, HH:mm")}
        </p>
        <Button variant="glass" size="sm" onClick={onGenerate} disabled={busy}>
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>

      <Tabs defaultValue="twitter">
        <TabsList>
          <TabsTrigger value="twitter">
            <MessageCircle className="h-3.5 w-3.5" /> Twitter ({pack.twitterThread?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="linkedin">
            <Megaphone className="h-3.5 w-3.5" /> LinkedIn
          </TabsTrigger>
          <TabsTrigger value="instagram">
            <Camera className="h-3.5 w-3.5" /> Instagram
          </TabsTrigger>
        </TabsList>

        <TabsContent value="twitter" className="mt-3 space-y-2">
          {(pack.twitterThread || []).length === 0 && (
            <GlassCard className="p-4 text-sm text-muted-foreground italic">
              No tweets generated.
            </GlassCard>
          )}
          {(pack.twitterThread || []).map((t, i) => (
            <GlassCard key={i} className="p-4 flex items-start gap-3">
              <span className="h-6 w-6 rounded-full glass border border-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-line wrap-break-word">{t}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                  {t.length} chars
                </p>
              </div>
              <CopyButton text={t} />
            </GlassCard>
          ))}
        </TabsContent>

        <TabsContent value="linkedin" className="mt-3">
          <GlassCard className="p-4">
            {pack.linkedinPost ? (
              <>
                <p className="text-sm whitespace-pre-line wrap-break-word">
                  {pack.linkedinPost}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {pack.linkedinPost.length} chars
                  </p>
                  <CopyButton text={pack.linkedinPost} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No LinkedIn post generated.
              </p>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="instagram" className="mt-3">
          <GlassCard className="p-4">
            {pack.instagramCaption ? (
              <>
                <p className="text-sm whitespace-pre-line wrap-break-word">
                  {pack.instagramCaption}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {pack.instagramCaption.length} chars
                  </p>
                  <CopyButton text={pack.instagramCaption} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No Instagram caption generated.
              </p>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClick}>
      <Copy className={`h-3.5 w-3.5 ${done ? "text-emerald-400" : ""}`} />
    </Button>
  );
}
