import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Plus,
  LayoutGrid,
  List,
  MoreHorizontal,
  Trash2,
  Edit,
  ExternalLink,
  CopyPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import DataTable from "@/components/shared/DataTable";
import GradientButton from "@/components/shared/GradientButton";
import GlassCard from "@/components/shared/GlassCard";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ArticleStatusBadge from "@/components/user/ArticleStatusBadge";
import { Button } from "@/components/ui/button";
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
  fetchArticles,
  removeArticle,
  duplicateArticle,
} from "@/redux/slice/article-slice";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater, formatNumber, truncate } from "@/lib/utils";
import useDebounce from "@/hooks/useDebounce";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "researching", label: "In progress" },
  { value: "draft_ready", label: "Ready" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
  { value: "needs_revision", label: "Needs revision" },
];

// Map UI tab → backend status filter (some tabs are aliases)
const tabToStatus = (tab) => {
  if (tab === "all") return undefined;
  if (tab === "researching") {
    // Backend filter is exact-match; we'll do client-side widening below.
    return undefined;
  }
  return tab;
};

const IN_PROGRESS_STATUSES = new Set([
  "researching",
  "outlining",
  "drafting",
  "seo_optimizing",
  "originality_checking",
  "publishing",
]);

export default function ArticlesPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list, pagination, isLoading } = useSelector((s) => s.articles);

  const [view, setView] = useState("grid");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const debounced = useDebounce(search, 300);

  /* Load on mount + filter changes */
  useEffect(() => {
    const status = tabToStatus(tab);
    dispatch(
      fetchArticles({
        page,
        perPage: 20,
        ...(status ? { status } : {}),
        ...(debounced ? { search: debounced } : {}),
      })
    );
  }, [dispatch, page, tab, debounced]);

  /* Client-side filter for "In progress" pseudo-tab */
  const visible = useMemo(() => {
    if (tab !== "researching") return list;
    return list.filter((a) => IN_PROGRESS_STATUSES.has(a.status));
  }, [list, tab]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await dispatch(removeArticle(confirmDelete._id)).unwrap();
      toast.success("Article moved to trash");
    } catch (err) {
      toast.error(err || "Could not delete");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleDuplicate = async (article) => {
    try {
      const result = await dispatch(duplicateArticle(article._id)).unwrap();
      const newId = result?.data?._id;
      toast.success("Article duplicated");
      if (newId) navigate(`/dashboard/articles/${newId}`);
    } catch (err) {
      toast.error(err || "Could not duplicate");
    }
  };

  /* ── Table columns ── */
  const columns = [
    {
      key: "topic",
      header: "Article",
      sortable: true,
      render: (a) => (
        <Link
          to={`/dashboard/articles/${a._id}`}
          className="block min-w-0 max-w-[420px]"
        >
          <p className="font-medium truncate hover:text-primary transition-colors">
            {a.seo?.metaTitle || a.topic}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {a.targetKeyword}
            {a.seo?.tags?.length
              ? ` · ${a.seo.tags.slice(0, 3).join(", ")}`
              : ""}
          </p>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (a) => <ArticleStatusBadge articleId={a._id} status={a.status} />,
    },
    {
      key: "wordCount",
      header: "Words",
      render: (a) => (
        <span className="text-xs tabular-nums">
          {a.wordCount > 0 ? formatNumber(a.wordCount) : "—"}
        </span>
      ),
    },
    {
      key: "tone",
      header: "Tone",
      render: (a) => <span className="text-xs">{a.tone}</span>,
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
      key: "cost",
      header: "Cost",
      render: (a) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {a.costs?.totalUsd ? `$${a.costs.totalUsd.toFixed(4)}` : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (a) => <RowActions article={a} onDelete={setConfirmDelete} onDuplicate={handleDuplicate} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="My Articles"
        subtitle={
          pagination?.total !== undefined
            ? `${pagination.total} articles in your workspace`
            : "Your generated articles"
        }
        actions={
          <Link to="/dashboard/new-article">
            <GradientButton size="md">
              <Plus className="h-4 w-4" /> New article
            </GradientButton>
          </Link>
        }
      />

      {/* Status tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl glass border border-white/10 w-fit overflow-x-auto">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              tab === t.value
                ? "gradient-bg text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by topic or keyword…"
        onReset={() => {
          setSearch("");
          setTab("all");
          setPage(1);
        }}
      >
        <div className="flex items-center gap-1 p-1 rounded-lg glass border border-white/10">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={view === "table" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("table")}
            aria-label="Table view"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </FilterBar>

      {isLoading && visible.length === 0 ? (
        <ListSkeleton />
      ) : view === "table" ? (
        <DataTable
          data={visible}
          columns={columns}
          onRowClick={(a) => navigate(`/dashboard/articles/${a._id}`)}
          emptyTitle="No articles yet"
          emptyDescription="Submit a topic on the New Article page to see it here."
        />
      ) : (
        <motion.div
          variants={staggerContainer(0.04)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {visible.length === 0 ? (
            <div className="col-span-full">
              <EmptyState />
            </div>
          ) : (
            visible.map((a) => (
              <motion.div key={a._id} variants={staggerItem}>
                <ArticleGridCard
                  article={a}
                  onDelete={() => setConfirmDelete(a)}
                  onDuplicate={() => handleDuplicate(a)}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete this article?"
        description="It will move to trash and can be restored within 30 days."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 *  Card / Empty / Skeleton / Pagination
 * ────────────────────────────────────────────────────────── */
function ArticleGridCard({ article, onDelete, onDuplicate }) {
  return (
    <GlassCard hover className="p-5 h-full flex flex-col card-hover">
      <div className="flex items-start justify-between gap-2 mb-2">
        <ArticleStatusBadge articleId={article._id} status={article.status} />
        <RowActions article={article} onDelete={() => onDelete()} onDuplicate={() => onDuplicate?.()} />
      </div>
      <Link
        to={`/dashboard/articles/${article._id}`}
        className="block flex-1 min-w-0"
      >
        <h3 className="font-display text-base leading-snug line-clamp-2 hover:text-primary transition-colors">
          {article.seo?.metaTitle || article.topic}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
          {truncate(article.seo?.metaDescription || article.targetKeyword, 120)}
        </p>
      </Link>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {article.wordCount > 0 ? `${formatNumber(article.wordCount)}w` : "—"}
        </span>
        <span>{dateFormater(article.createdAt, "MMM d")}</span>
        {article.cmsPostUrl ? (
          <a
            href={article.cmsPostUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" /> Live
          </a>
        ) : null}
      </div>
    </GlassCard>
  );
}

function RowActions({ article, onDelete, onDuplicate }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/dashboard/articles/${article._id}`}>
            <Edit className="h-3.5 w-3.5" /> Open
          </Link>
        </DropdownMenuItem>
        {article.cmsPostUrl && (
          <DropdownMenuItem asChild>
            <a href={article.cmsPostUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> View on CMS
            </a>
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(article)}>
            <CopyPlus className="h-3.5 w-3.5" /> Duplicate
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState() {
  return (
    <GlassCard className="p-10 text-center">
      <h3 className="text-base font-semibold">No articles yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Generate your first AI-researched article in 5 minutes.
      </p>
      <Link to="/dashboard/new-article" className="inline-block mt-4">
        <GradientButton size="md">
          <Plus className="h-4 w-4" /> Generate article
        </GradientButton>
      </Link>
    </GlassCard>
  );
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <GlassCard key={i} className="p-5 h-44 animate-pulse" />
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums px-2">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
