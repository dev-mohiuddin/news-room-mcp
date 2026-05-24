import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  LayoutGrid,
  List,
  Search,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";

import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import GradientButton from "@/components/shared/GradientButton";
import ArticleCard from "@/components/user/ArticleCard";
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
import { staggerContainer, staggerItem } from "@/lib/animations";
import { dateFormater, formatNumber } from "@/lib/utils";
import useDebounce from "@/hooks/useDebounce";
import { MY_ARTICLES, ARTICLE_TABS_COUNT } from "@/lib/mockData";
import { toast } from "sonner";

const STATUS_TABS = ["all", "draft", "scheduled", "published", "failed"];

export default function ArticlesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState("grid"); // grid | table
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [cmsFilter, setCmsFilter] = useState("all");
  const debounced = useDebounce(search, 300);

  const filtered = useMemo(() => {
    return MY_ARTICLES.filter((a) => {
      const matchesTab = tab === "all" || a.status === tab;
      const matchesSearch =
        !debounced || a.title.toLowerCase().includes(debounced.toLowerCase());
      const matchesCms = cmsFilter === "all" || a.cms === cmsFilter;
      return matchesTab && matchesSearch && matchesCms;
    });
  }, [tab, debounced, cmsFilter]);

  const onAction = (action, article) => {
    switch (action) {
      case "edit":
        navigate(`/dashboard/articles/${article.id}`);
        break;
      case "duplicate":
        toast.success(`"${article.title}" duplicated as draft`);
        break;
      case "view-cms":
        toast.info("Opening in CMS…");
        break;
      case "delete":
        toast.success(`"${article.title}" moved to trash`);
        break;
    }
  };

  const columns = [
    {
      key: "title",
      header: "Article",
      sortable: true,
      render: (a) => (
        <Link to={`/dashboard/articles/${a.id}`} className="block min-w-0">
          <p className="font-medium truncate hover:text-primary transition-colors">{a.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {a.tags?.join(", ")} · {a.author}
          </p>
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    { key: "cms", header: "CMS", render: (a) => <span className="text-xs">{a.cms}</span> },
    { key: "words", header: "Words", sortable: true, render: (a) => <span className="tabular-nums text-xs">{a.words}</span> },
    {
      key: "seoScore",
      header: "SEO",
      sortable: true,
      render: (a) => (
        <span className={`text-xs font-semibold tabular-nums ${a.seoScore >= 90 ? "text-emerald-400" : a.seoScore >= 70 ? "text-blue-400" : "text-amber-400"}`}>
          {a.seoScore}
        </span>
      ),
    },
    {
      key: "views",
      header: "Views",
      sortable: true,
      render: (a) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {a.status === "published" ? formatNumber(a.views) : "—"}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      render: (a) => <span className="text-xs text-muted-foreground">{dateFormater(a.updatedAt, "MMM d")}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (a) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction("edit", a)}>
              <Edit className="h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("duplicate", a)}>
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            {a.status === "published" && (
              <DropdownMenuItem onClick={() => onAction("view-cms", a)}>
                <ExternalLink className="h-3.5 w-3.5" /> View on CMS
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onAction("delete", a)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="My Articles"
        subtitle={`${MY_ARTICLES.length} articles in your workspace`}
        actions={
          <Link to="/dashboard/new-article">
            <GradientButton size="md">
              <Plus className="h-4 w-4" /> New article
            </GradientButton>
          </Link>
        }
      />

      {/* Status tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl glass border border-white/10 w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
              tab === t
                ? "gradient-bg text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} {ARTICLE_TABS_COUNT[t] > 0 && <span className="ml-1 opacity-70">({ARTICLE_TABS_COUNT[t]})</span>}
          </button>
        ))}
      </div>

      {/* Filter + view toggle */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search articles…"
        onReset={() => { setSearch(""); setCmsFilter("all"); }}
      >
        <Select value={cmsFilter} onValueChange={setCmsFilter}>
          <SelectTrigger className="h-9 w-[130px] bg-transparent border-white/10">
            <SelectValue placeholder="CMS" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CMS</SelectItem>
            <SelectItem value="WordPress">WordPress</SelectItem>
            <SelectItem value="Ghost">Ghost</SelectItem>
            <SelectItem value="Contentful">Contentful</SelectItem>
            <SelectItem value="Sanity">Sanity</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 p-1 rounded-lg glass border border-white/10">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={view === "table" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("table")}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </FilterBar>

      {/* Content */}
      {view === "table" ? (
        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(a) => navigate(`/dashboard/articles/${a.id}`)}
          emptyTitle="No articles match"
          emptyDescription="Try changing your filters or create a new article."
        />
      ) : (
        <motion.div
          variants={staggerContainer(0.04)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-16 text-sm text-muted-foreground">
              No articles match your filters.
            </div>
          ) : (
            filtered.map((a) => (
              <motion.div key={a.id} variants={staggerItem}>
                <ArticleCard article={a} onAction={onAction} />
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
