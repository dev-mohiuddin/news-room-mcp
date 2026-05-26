import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FileText,
  EyeOff,
  Eye,
  Flag,
  ExternalLink,
  MoreHorizontal,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import FilterBar from "@/components/shared/FilterBar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import useDebounce from "@/hooks/useDebounce";
import { dateFormater, formatNumber } from "@/lib/utils";
import {
  fetchAdminArticles,
  toggleArticleHidden,
  toggleArticleFlagged,
} from "@/redux/slice/admin-slice";

export default function AdminContentMonitorPage() {
  const dispatch = useDispatch();
  const { articles, articlesPagination, isLoading } = useSelector(
    (s) => s.admin
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [flaggedFilter, setFlaggedFilter] = useState("all");
  const [hiddenFilter, setHiddenFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [flagDialog, setFlagDialog] = useState({ open: false, article: null });
  const [flagReason, setFlagReason] = useState("");

  const debounced = useDebounce(search, 300);

  /* Fetch on filters/page changes */
  useEffect(() => {
    const params = { page, perPage: 20 };
    if (debounced) params.search = debounced;
    if (statusFilter !== "all") params.status = statusFilter;
    if (flaggedFilter === "yes") params.flagged = true;
    if (hiddenFilter === "yes") params.hidden = true;
    dispatch(fetchAdminArticles(params));
  }, [dispatch, page, debounced, statusFilter, flaggedFilter, hiddenFilter]);

  const stats = useMemo(() => {
    const total = articlesPagination?.total || articles.length;
    const flagged = articles.filter((a) => a.moderation?.flagged).length;
    const hidden = articles.filter((a) => a.moderation?.hidden).length;
    const failed = articles.filter((a) => a.status === "failed").length;
    return { total, flagged, hidden, failed };
  }, [articles, articlesPagination]);

  const onToggleHide = async (article) => {
    const next = !article.moderation?.hidden;
    const action = next ? "Hide" : "Restore";
    if (!window.confirm(`${action} "${truncate(getTitle(article), 60)}"?`)) {
      return;
    }
    try {
      await dispatch(
        toggleArticleHidden({ id: article._id, hidden: next })
      ).unwrap();
      toast.success(next ? "Article hidden" : "Article restored");
    } catch (err) {
      toast.error(err || "Could not update visibility");
    }
  };

  const openFlagDialog = (article) => {
    setFlagReason(article.moderation?.flagReason || "");
    setFlagDialog({ open: true, article });
  };

  const submitFlag = async () => {
    const article = flagDialog.article;
    if (!article) return;
    try {
      await dispatch(
        toggleArticleFlagged({
          id: article._id,
          flagged: true,
          reason: flagReason.trim() || null,
        })
      ).unwrap();
      toast.success("Flagged for review");
      setFlagDialog({ open: false, article: null });
      setFlagReason("");
    } catch (err) {
      toast.error(err || "Could not flag");
    }
  };

  const clearFlag = async (article) => {
    try {
      await dispatch(
        toggleArticleFlagged({
          id: article._id,
          flagged: false,
          reason: null,
        })
      ).unwrap();
      toast.success("Flag cleared");
    } catch (err) {
      toast.error(err || "Could not clear flag");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content moderation"
        title="All articles"
        subtitle="Cross-tenant article monitor. Flag, hide, or open in CMS."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={FileText} label="Visible articles" value={formatNumber(stats.total)} />
        <KPICard icon={Flag} label="Flagged" value={stats.flagged} glow="violet" />
        <KPICard icon={EyeOff} label="Hidden" value={stats.hidden} />
        <KPICard icon={AlertTriangle} label="Failed" value={stats.failed} glow="violet" />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search topic or keyword…"
        onReset={() => {
          setSearch("");
          setStatusFilter("all");
          setFlaggedFilter("all");
          setHiddenFilter("all");
          setPage(1);
        }}
      >
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[160px] bg-transparent border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft_ready">Draft ready</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="needs_revision">Needs revision</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={flaggedFilter} onValueChange={(v) => { setFlaggedFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Flagged" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Flagged only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hiddenFilter} onValueChange={(v) => { setHiddenFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Hidden" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Hidden only</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        loading={isLoading}
        data={articles}
        pageSize={100}
        emptyTitle="No articles"
        emptyDescription="No articles match these filters yet."
        columns={[
          {
            key: "title",
            header: "Article",
            render: (a) => (
              <div className="min-w-0">
                <p className="font-medium truncate flex items-center gap-2">
                  {a.moderation?.flagged && (
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  )}
                  {a.moderation?.hidden && (
                    <Badge variant="outline" className="text-[9px] border-red-500/40 text-red-300">
                      hidden
                    </Badge>
                  )}
                  <span className="truncate">{getTitle(a)}</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {a.workspaceId?.name || "—"} ·{" "}
                  {a.createdBy?.name || a.createdBy?.email || "—"}
                </p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (a) => <StatusBadge status={a.status} />,
          },
          {
            key: "wordCount",
            header: "Words",
            render: (a) => (
              <span className="tabular-nums">
                {formatNumber(a.wordCount || 0)}
              </span>
            ),
          },
          {
            key: "createdAt",
            header: "Created",
            render: (a) => (
              <span className="text-xs text-muted-foreground">
                {dateFormater(a.createdAt, "MMM d, HH:mm")}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "w-12",
            render: (a) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {a.cmsPostUrl && (
                    <>
                      <DropdownMenuItem asChild>
                        <a
                          href={a.cmsPostUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View on CMS
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {a.moderation?.flagged ? (
                    <DropdownMenuItem onClick={() => clearFlag(a)}>
                      <Flag className="h-3.5 w-3.5" /> Clear flag
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => openFlagDialog(a)}>
                      <Flag className="h-3.5 w-3.5" /> Flag for review
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onToggleHide(a)}
                    className={a.moderation?.hidden ? "" : "text-destructive focus:text-destructive"}
                  >
                    {a.moderation?.hidden ? (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Restore visibility
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Hide article
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />

      {articlesPagination && articlesPagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {articlesPagination.page} of {articlesPagination.totalPages} ·{" "}
            {formatNumber(articlesPagination.total)} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="glass"
              size="sm"
              disabled={!articlesPagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="glass"
              size="sm"
              disabled={!articlesPagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={flagDialog.open}
        onOpenChange={(open) =>
          setFlagDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Flag article for review</DialogTitle>
            <DialogDescription>
              Visible to platform admins on the moderation queue. The workspace
              owner is not notified automatically.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Reason (e.g. policy violation, spam, low quality)…"
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setFlagDialog({ open: false, article: null })
              }
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={submitFlag}
              disabled={!flagReason.trim()}
            >
              <Flag className="h-4 w-4" /> Flag article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getTitle(a) {
  return a?.seo?.metaTitle || a?.topic || "Untitled article";
}

function truncate(s, n) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
