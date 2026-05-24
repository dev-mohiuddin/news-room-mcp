import { useMemo, useState } from "react";
import { FileText, EyeOff, Flag, ExternalLink, MoreHorizontal } from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import KPICard from "@/components/shared/KPICard";
import FilterBar from "@/components/shared/FilterBar";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
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
} from "@/components/ui/dropdown-menu";
import useDebounce from "@/hooks/useDebounce";
import { dateFormater } from "@/lib/utils";
import { MOCK_ARTICLES } from "@/lib/mockData";

export default function AdminContentMonitorPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cmsFilter, setCmsFilter] = useState("all");

  const debounced = useDebounce(search, 300);

  const filtered = useMemo(() => {
    return MOCK_ARTICLES.filter((a) => {
      const matchesSearch =
        !debounced ||
        a.title.toLowerCase().includes(debounced.toLowerCase()) ||
        a.workspace.toLowerCase().includes(debounced.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const matchesCms = cmsFilter === "all" || a.cms === cmsFilter;
      return matchesSearch && matchesStatus && matchesCms;
    });
  }, [debounced, statusFilter, cmsFilter]);

  const stats = useMemo(() => {
    const total = MOCK_ARTICLES.length;
    const published = MOCK_ARTICLES.filter((a) => a.status === "published").length;
    const drafts = MOCK_ARTICLES.filter((a) => a.status === "draft").length;
    const failed = MOCK_ARTICLES.filter((a) => a.status === "failed").length;
    return { total, published, drafts, failed };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="All articles"
        subtitle="Cross-tenant article monitor. Flag, hide, or open in CMS."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={FileText} label="Total articles" value={stats.total * 1547} />
        <KPICard icon={FileText} label="Published" value={stats.published * 1142} glow="teal" />
        <KPICard icon={FileText} label="Drafts" value={stats.drafts * 380} />
        <KPICard icon={Flag} label="Failed" value={stats.failed * 12} glow="violet" />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title or workspace…"
        onReset={() => {
          setSearch("");
          setStatusFilter("all");
          setCmsFilter("all");
        }}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cmsFilter} onValueChange={setCmsFilter}>
          <SelectTrigger className="h-9 w-[140px] bg-transparent border-white/10">
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
      </FilterBar>

      <DataTable
        data={filtered}
        columns={[
          {
            key: "title",
            header: "Article",
            sortable: true,
            render: (a) => (
              <div className="min-w-0">
                <p className="font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {a.workspace} · {a.author}
                </p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (a) => <StatusBadge status={a.status} />,
          },
          { key: "cms", header: "CMS" },
          {
            key: "words",
            header: "Words",
            sortable: true,
            render: (a) => <span className="tabular-nums">{a.words}</span>,
          },
          {
            key: "createdAt",
            header: "Created",
            sortable: true,
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
            render: () => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <ExternalLink className="h-3.5 w-3.5" /> View on CMS
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Flag className="h-3.5 w-3.5" /> Flag for review
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <EyeOff className="h-3.5 w-3.5" /> Hide article
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />
    </div>
  );
}
