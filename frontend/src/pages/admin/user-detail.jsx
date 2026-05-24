import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  KeyRound,
  Mail,
  Calendar,
  CreditCard,
  Activity,
  FileText,
  ShieldX,
  ShieldCheck,
} from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import PlanBadge from "@/components/shared/PlanBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import KPICard from "@/components/shared/KPICard";
import DataTable from "@/components/shared/DataTable";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { dateFormater } from "@/lib/utils";
import { MOCK_USERS, MOCK_ARTICLES, MOCK_AUDIT_LOGS } from "@/lib/mockData";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = useMemo(
    () => MOCK_USERS.find((u) => u.id === id) || MOCK_USERS[0],
    [id]
  );

  const userArticles = useMemo(
    () => MOCK_ARTICLES.slice(0, 6),
    []
  );

  const userLogs = useMemo(
    () => MOCK_AUDIT_LOGS.filter((l) => l.target?.includes(user.email) || l.actor === user.email).concat(MOCK_AUDIT_LOGS.slice(0, 3)),
    [user.email]
  );

  const [confirmSuspend, setConfirmSuspend] = useState(false);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin/users")}
        className="text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Button>

      {/* Profile header */}
      <GlassCard className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center text-white text-3xl font-display shadow-[0_8px_30px_rgba(59,130,246,0.4)]">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl">{user.name}</h1>
              <PlanBadge plan={user.plan} />
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  user.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}
              >
                {user.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-3 w-3" /> Joined{" "}
              {dateFormater(user.createdAt, "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="glass" size="sm">
              <KeyRound className="h-4 w-4" /> Reset password
            </Button>
            <Button
              variant={user.status === "active" ? "destructive" : "default"}
              size="sm"
              onClick={() => setConfirmSuspend(true)}
            >
              {user.status === "active" ? (
                <>
                  <ShieldX className="h-4 w-4" /> Suspend
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Activate
                </>
              )}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={FileText} label="Articles" value={user.articles} />
        <KPICard
          icon={CreditCard}
          label="MRR"
          value={user.mrr}
          prefix="$"
        />
        <KPICard icon={Activity} label="API calls (30d)" value={4280} />
        <KPICard
          icon={Calendar}
          label="Days active"
          value={Math.max(
            1,
            Math.round(
              (Date.now() - new Date(user.createdAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="logs">Audit logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard className="p-6">
              <h3 className="font-display text-lg mb-4">Workspace</h3>
              <dl className="space-y-3 text-sm">
                {[
                  ["Workspace ID", `ws_${user.id}`],
                  ["Members", user.plan === "agency" ? "Unlimited" : user.plan === "pro" ? "5" : "1"],
                  ["CMS connections", "WordPress, Ghost"],
                  ["Brand voices", "2"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-white/5 pb-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="font-display text-lg mb-4">Usage this month</h3>
              <div className="space-y-4">
                <UsageBar label="Articles" value={user.articles % 50} max={user.plan === "free" ? 10 : user.plan === "starter" ? 50 : 200} />
                <UsageBar label="Research queries" value={142} max={500} />
                <UsageBar label="Storage (MB)" value={86} max={1024} />
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="articles">
          <DataTable
            data={userArticles}
            columns={[
              { key: "title", header: "Title", render: (a) => <span className="font-medium">{a.title}</span> },
              { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
              { key: "words", header: "Words", render: (a) => <span className="tabular-nums">{a.words}</span> },
              { key: "cms", header: "CMS" },
              {
                key: "createdAt",
                header: "Created",
                render: (a) => (
                  <span className="text-xs text-muted-foreground">
                    {dateFormater(a.createdAt, "MMM d")}
                  </span>
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="subscription">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Current plan</p>
                <h3 className="font-display text-2xl mt-1 capitalize">{user.plan}</h3>
              </div>
              <Button variant="glass">Change plan</Button>
            </div>
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/10">
              <Stat label="Status" value="Active" />
              <Stat label="MRR" value={`$${user.mrr}`} />
              <Stat label="Period start" value={dateFormater("2026-05-01", "MMM d")} />
              <Stat label="Period end" value={dateFormater("2026-06-01", "MMM d")} />
            </dl>
          </GlassCard>
        </TabsContent>

        <TabsContent value="logs">
          <DataTable
            data={userLogs}
            columns={[
              { key: "action", header: "Action", render: (l) => <code className="text-xs">{l.action}</code> },
              { key: "actor", header: "Actor" },
              { key: "status", header: "Status", render: (l) => <StatusPill status={l.status} /> },
              {
                key: "time",
                header: "Time",
                render: (l) => (
                  <span className="text-xs text-muted-foreground">
                    {dateFormater(l.time, "MMM d, HH:mm")}
                  </span>
                ),
              },
              { key: "ip", header: "IP" },
            ]}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmSuspend}
        onOpenChange={setConfirmSuspend}
        title={`${user.status === "active" ? "Suspend" : "Activate"} ${user.name}?`}
        description={
          user.status === "active"
            ? "The user will lose access to their workspace immediately."
            : "The user will regain access to their workspace."
        }
        destructive={user.status === "active"}
        confirmLabel={user.status === "active" ? "Suspend" : "Activate"}
        onConfirm={() => setConfirmSuspend(false)}
      />
    </div>
  );
}

function UsageBar({ label, value, max }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const danger = pct >= 80;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {value} / {max}
        </p>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full ${danger ? "bg-red-500" : "gradient-bg"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
      <p className="font-display text-lg mt-1">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    error: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
        map[status] || map.success
      }`}
    >
      {status}
    </span>
  );
}
