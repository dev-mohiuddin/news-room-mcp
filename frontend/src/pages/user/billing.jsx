import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Sparkles,
  Check,
  Download,
  ArrowRight,
  Receipt,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import UsageBar from "@/components/shared/UsageBar";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { staggerContainer, staggerItem, fadeUp } from "@/lib/animations";
import { dateFormater } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/constants";
import { USER_INVOICES } from "@/lib/mockData";

const CURRENT_PLAN = "pro";
const USAGE = {
  articles: { used: 142, limit: 200 },
  research: { used: 312, limit: 500 },
  storage: { used: 86, limit: 1024 },
  team: { used: 5, limit: 5 },
};

export default function UserBillingPage() {
  const [yearly, setYearly] = useState(false);
  const plan = PLANS.find((p) => p.id === CURRENT_PLAN);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Subscription"
        title="Billing & Plan"
        subtitle="Manage your subscription, view usage, and download invoices."
      />

      {/* Current plan + usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard glow="violet" className="p-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Current plan
              </p>
              <h3 className="font-display text-3xl mt-1 capitalize gradient-text">
                {plan?.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                ${plan?.price}/month · Renews Jun 12, 2026
              </p>
            </div>
            <Badge variant="gradient" className="text-xs">
              <Zap className="h-3 w-3" /> Active
            </Badge>
          </div>

          <div className="mt-6 space-y-4">
            <UsageBar label="Articles" value={USAGE.articles.used} max={USAGE.articles.limit} />
            <UsageBar label="Research queries" value={USAGE.research.used} max={USAGE.research.limit} />
            <UsageBar label="Storage (MB)" value={USAGE.storage.used} max={USAGE.storage.limit} />
            <UsageBar label="Team members" value={USAGE.team.used} max={USAGE.team.limit} />
          </div>

          <div className="mt-6 flex items-center gap-3 pt-4 border-t border-white/5">
            <Button variant="glass" size="sm">
              Cancel subscription
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Switch to yearly (save 20%)
            </Button>
          </div>
        </GlassCard>

        {/* Payment method */}
        <GlassCard className="p-6 flex flex-col">
          <h3 className="font-display text-lg mb-4">Payment method</h3>
          <div className="flex items-center gap-3 p-4 rounded-lg glass border border-white/5 flex-1">
            <CreditCard className="h-8 w-8 text-brand-blue" />
            <div>
              <p className="text-sm font-medium">•••• •••• •••• 4242</p>
              <p className="text-xs text-muted-foreground">Visa · Expires 08/28</p>
            </div>
          </div>
          <Button variant="glass" size="sm" className="mt-4 w-fit">
            Update card
          </Button>
        </GlassCard>
      </div>

      {/* Plan comparison */}
      <section>
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-4">
          <h2 className="font-display text-xl">Compare plans</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn("text-sm", !yearly ? "text-foreground" : "text-muted-foreground")}>
              Monthly
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span className={cn("text-sm", yearly ? "text-foreground" : "text-muted-foreground")}>
              Yearly
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Save 20%
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {PLANS.map((p) => {
            const isCurrent = p.id === CURRENT_PLAN;
            return (
              <motion.div key={p.id} variants={staggerItem}>
                <GlassCard
                  hover
                  glow={p.highlight ? "blue" : null}
                  className={cn(
                    "p-5 h-full flex flex-col relative",
                    isCurrent && "ring-2 ring-primary/30"
                  )}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest gradient-bg text-white px-2.5 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                  <h4 className="font-display text-lg">{p.name}</h4>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <span className="font-display text-3xl">
                      {yearly ? p.yearlyPrice : p.price}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 mt-0.5 text-brand-teal shrink-0" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="glass" size="sm" className="mt-5 w-full" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <GradientButton
                      size="sm"
                      className="mt-5 w-full"
                      onClick={() => toast.success(`Upgrade to ${p.name} initiated`)}
                    >
                      {p.price > (PLANS.find((x) => x.id === CURRENT_PLAN)?.price || 0)
                        ? "Upgrade"
                        : "Downgrade"}{" "}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </GradientButton>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Invoice history */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Invoice history</h2>
          <Button variant="glass" size="sm">
            <Download className="h-4 w-4" /> Download all
          </Button>
        </div>

        <DataTable
          data={USER_INVOICES}
          columns={[
            {
              key: "number",
              header: "Invoice",
              render: (i) => (
                <span className="font-mono text-xs flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                  {i.number}
                </span>
              ),
            },
            {
              key: "date",
              header: "Date",
              sortable: true,
              render: (i) => (
                <span className="text-xs text-muted-foreground">
                  {dateFormater(i.date, "MMM d, yyyy")}
                </span>
              ),
            },
            { key: "plan", header: "Plan" },
            {
              key: "amount",
              header: "Amount",
              render: (i) => <span className="tabular-nums">${i.amount}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (i) => (
                <span className="text-xs px-2 py-0.5 rounded-full border capitalize bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                  {i.status}
                </span>
              ),
            },
            { key: "method", header: "Method" },
            {
              key: "actions",
              header: "",
              className: "w-12",
              render: () => (
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
