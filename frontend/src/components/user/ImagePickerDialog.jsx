import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import {
  Search,
  Upload,
  Wand2,
  CheckCircle2,
  ImageIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import GradientButton from "@/components/shared/GradientButton";
import GlassCard from "@/components/shared/GlassCard";
import {
  generateImageBriefApi,
  searchUnsplashApi,
  selectUnsplashImageApi,
  uploadFeaturedImageApi,
} from "@/api/article/article";
import { fetchArticleById } from "@/redux/slice/article-slice";

/**
 * Image Picker Dialog — Phase B (B7)
 *
 *  Three tabs:
 *   1. Unsplash search (results grid → click selects + ingests)
 *   2. Upload (file input → multipart upload)
 *   3. AI brief (Haiku-generated description, copyable for an external generator)
 */
export default function ImagePickerDialog({ open, onOpenChange, article }) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState("unsplash");
  const [busy, setBusy] = useState(false);

  // Unsplash state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pickedId, setPickedId] = useState(null);

  // Upload state
  const fileInputRef = useRef(null);
  const [fileAlt, setFileAlt] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  // AI brief state
  const [brief, setBrief] = useState(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  /* Reset state on open + autopopulate query with target keyword */
  useEffect(() => {
    if (!open || !article) return;
    setQuery(article.targetKeyword || article.topic || "");
    setResults([]);
    setPickedId(null);
    setBrief(null);
    setFilePreview(null);
    setPendingFile(null);
    setFileAlt("");
  }, [open, article?._id]);

  const onSearch = async () => {
    if (!article || !query.trim()) {
      toast.error("Enter a search query");
      return;
    }
    setSearching(true);
    try {
      const res = await searchUnsplashApi(article._id, query.trim());
      if (res?.success) {
        setResults(res.data || []);
        if (!(res.data || []).length) {
          toast.info("No results — try a different query");
        }
      } else {
        toast.error(res?.message || "Search failed");
      }
    } finally {
      setSearching(false);
    }
  };

  const onPickUnsplash = async (item) => {
    if (!article) return;
    setPickedId(item.id);
    setBusy(true);
    try {
      const res = await selectUnsplashImageApi(article._id, {
        imageUrl: item.urls?.regular || item.urls?.full,
        alt: item.altDescription || article.targetKeyword || "",
        photographerName: item.photographer?.name,
        photographerUrl: item.photographer?.profileUrl,
      });
      if (res?.success) {
        toast.success("Featured image set");
        dispatch(fetchArticleById(article._id));
        onOpenChange(false);
      } else {
        toast.error(res?.message || "Could not set image");
      }
    } finally {
      setBusy(false);
      setPickedId(null);
    }
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast.error("Only JPEG, PNG, or WebP images are supported");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Image exceeds 10MB limit");
      return;
    }
    setPendingFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  const onUpload = async () => {
    if (!article || !pendingFile) {
      toast.error("Pick a file first");
      return;
    }
    setBusy(true);
    try {
      const res = await uploadFeaturedImageApi(
        article._id,
        pendingFile,
        fileAlt
      );
      if (res?.success) {
        toast.success("Image uploaded");
        dispatch(fetchArticleById(article._id));
        onOpenChange(false);
      } else {
        toast.error(res?.message || "Upload failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const onGenerateBrief = async () => {
    if (!article) return;
    setGeneratingBrief(true);
    try {
      const res = await generateImageBriefApi(article._id);
      if (res?.success) {
        setBrief(res.data);
      } else {
        toast.error(res?.message || "Could not generate brief");
      }
    } finally {
      setGeneratingBrief(false);
    }
  };

  const copyBrief = async () => {
    if (!brief) return;
    const text = [
      brief.scene && `SCENE:\n${brief.scene}`,
      brief.style && `\nSTYLE:\n${brief.style}`,
      brief.composition && `\nCOMPOSITION:\n${brief.composition}`,
      brief.colorPalette && `\nPALETTE:\n${brief.colorPalette}`,
      brief.altText && `\nALT TEXT:\n${brief.altText}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Brief copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Featured image</DialogTitle>
          <DialogDescription>
            Pick a stock photo, upload your own, or generate an AI brief.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="unsplash">
              <Search className="h-3.5 w-3.5" /> Unsplash
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-3.5 w-3.5" /> Upload
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Wand2 className="h-3.5 w-3.5" /> AI brief
            </TabsTrigger>
          </TabsList>

          {/* ─── Unsplash ─── */}
          <TabsContent value="unsplash" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSearch();
                  }
                }}
                placeholder="Search Unsplash for hero photos…"
                className="flex-1"
              />
              <Button
                variant="glass"
                onClick={onSearch}
                disabled={searching || !query.trim()}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>

            {results.length === 0 && !searching && (
              <GlassCard className="p-8 text-center">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">
                  Search Unsplash for a photo to feature.
                </p>
              </GlassCard>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onPickUnsplash(item)}
                  className={`relative group rounded-lg overflow-hidden glass border border-white/10 hover:border-primary/40 hover:ring-2 hover:ring-primary/20 transition-all ${
                    pickedId === item.id
                      ? "ring-2 ring-primary/40 border-primary/40"
                      : ""
                  }`}
                >
                  <img
                    src={item.urls?.thumb || item.urls?.small}
                    alt={item.altDescription || ""}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {pickedId === item.id ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    )}
                  </div>
                  {item.photographer?.name && (
                    <p className="absolute bottom-0 inset-x-0 px-2 py-1 text-[9px] text-white bg-black/60 truncate">
                      © {item.photographer.name}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </TabsContent>

          {/* ─── Upload ─── */}
          <TabsContent value="upload" className="mt-4 space-y-3">
            <div
              className="rounded-lg p-6 glass border-2 border-dashed border-white/10 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {filePreview ? (
                <img
                  src={filePreview}
                  alt="preview"
                  className="max-h-48 mx-auto rounded"
                />
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm mt-2">Click to pick a file</p>
                  <p className="text-[11px] text-muted-foreground">
                    JPEG, PNG, or WebP — max 10MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Alt text (accessibility)
              </Label>
              <Input
                value={fileAlt}
                onChange={(e) => setFileAlt(e.target.value)}
                placeholder="A describes-the-image sentence…"
                className="mt-1.5"
              />
            </div>
            <GradientButton
              size="md"
              className="w-full"
              onClick={onUpload}
              disabled={!pendingFile || busy}
            >
              <Upload className="h-4 w-4" />
              {busy ? "Uploading…" : "Upload as featured image"}
            </GradientButton>
          </TabsContent>

          {/* ─── AI brief ─── */}
          <TabsContent value="ai" className="mt-4 space-y-3">
            {!brief ? (
              <GlassCard className="p-6 text-center">
                <Wand2 className="h-8 w-8 mx-auto text-primary" />
                <p className="text-sm mt-2">
                  Generate a creative brief for your hero image.
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Paste it into Midjourney, DALL·E, or your favourite generator.
                </p>
                <GradientButton
                  size="md"
                  className="mt-4"
                  onClick={onGenerateBrief}
                  disabled={generatingBrief}
                >
                  <Wand2 className="h-4 w-4" />
                  {generatingBrief ? "Generating…" : "Generate brief"}
                </GradientButton>
              </GlassCard>
            ) : (
              <GlassCard className="p-5 space-y-3">
                {brief.scene && (
                  <BriefRow label="Scene" value={brief.scene} />
                )}
                {brief.style && (
                  <BriefRow label="Style" value={brief.style} />
                )}
                {brief.composition && (
                  <BriefRow label="Composition" value={brief.composition} />
                )}
                {brief.colorPalette && (
                  <BriefRow label="Color palette" value={brief.colorPalette} />
                )}
                {brief.altText && (
                  <BriefRow label="Alt text" value={brief.altText} />
                )}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBrief(null)}
                  >
                    Regenerate
                  </Button>
                  <GradientButton size="sm" onClick={copyBrief}>
                    <ExternalLink className="h-3.5 w-3.5" /> Copy brief
                  </GradientButton>
                </div>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BriefRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-sm mt-1 leading-relaxed">{value}</p>
    </div>
  );
}
