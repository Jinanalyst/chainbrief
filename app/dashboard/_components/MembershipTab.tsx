"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/components/analyst-dashboard-view";
import { cn } from "@/lib/cn";

type Currency = "USDT" | "USDC";
type Network = "ERC20" | "TRC20" | "MATIC";
type Plan = "free" | "pro" | "institutional";
type Cadence = "monthly" | "annual";

const PRICES: Record<Plan, Record<Cadence, number>> = {
  free: { monthly: 0, annual: 0 },
  pro: { monthly: 19, annual: 15 },
  institutional: { monthly: 79, annual: 63 },
};

const FEATURES: Record<Plan, { label: string; ok: boolean }[]> = {
  free: [
    { label: "Basic market analysis", ok: true },
    { label: "5 articles/month", ok: true },
    { label: "Community access", ok: true },
    { label: "Real-time alerts", ok: false },
    { label: "Advanced analytics", ok: false },
  ],
  pro: [
    { label: "Unlimited articles", ok: true },
    { label: "Real-time alerts", ok: true },
    { label: "Advanced analytics", ok: true },
    { label: "Community access", ok: true },
    { label: "Priority support", ok: true },
  ],
  institutional: [
    { label: "Everything in Pro", ok: true },
    { label: "API access", ok: true },
    { label: "Custom reports", ok: true },
    { label: "Team seats", ok: true },
    { label: "Dedicated support", ok: true },
  ],
};

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  institutional: "Institutional",
};

const PLAN_DIST = [
  { label: "Free", bar: "bg-muted-2" },
  { label: "Pro", bar: "bg-accent" },
  { label: "Institutional", bar: "bg-purple-500" },
];

const EMPTY_ANALYTICS: Pick<
  DashboardSnapshot,
  "thisMonthRevenue" | "totalSubscribers" | "revenueEstimate" | "memberships"
> = {
  thisMonthRevenue: 0,
  totalSubscribers: 0,
  revenueEstimate: 0,
  memberships: [],
};

export function MembershipTab({ showToast: _showToast }: { showToast: (msg: string) => void }) {
  const [view, setView] = useState<"user" | "creator">("user");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Membership</h2>
        <div className="flex gap-1 rounded-lg border border-tint/10 bg-tint/[0.04] p-1">
          {(["user", "creator"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition",
                view === item ? "bg-surface-2 text-ink shadow-soft" : "text-muted hover:text-ink",
              )}
            >
              {item === "creator" ? "Creator" : "User"}
            </button>
          ))}
        </div>
      </div>

      {view === "user" ? <UserView /> : <CreatorView />}
    </div>
  );
}

function UserView() {
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [currency, setCurrency] = useState<Currency>("USDT");
  const [network, setNetwork] = useState<Network>("ERC20");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-tint/10 bg-surface/60 px-6 py-5">
        <div>
          <p className="font-semibold text-ink">No active subscription</p>
          <p className="mt-0.5 text-sm text-muted">Choose a plan below to unlock full access.</p>
        </div>
        <span className="rounded-full border border-tint/10 bg-tint/[0.06] px-3 py-1 text-xs font-semibold text-muted">
          Free
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("text-sm font-medium", cadence === "monthly" ? "text-ink" : "text-muted")}>
          Monthly
        </span>
        <button
          type="button"
          onClick={() => setCadence((current) => current === "monthly" ? "annual" : "monthly")}
          className={cn("relative h-6 w-11 rounded-full transition-colors", cadence === "annual" ? "bg-accent" : "bg-tint/20")}
        >
          <span
            className={cn(
              "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
              cadence === "annual" ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
        <span className={cn("text-sm font-medium", cadence === "annual" ? "text-ink" : "text-muted")}>
          Annual
        </span>
        {cadence === "annual" && (
          <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
            Save 20%
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-tint/10 bg-tint/[0.03] px-4 py-3">
        <span className="text-xs font-semibold text-muted">Pay with</span>
        {(["USDT", "USDC"] as Currency[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setCurrency(item);
              if (item === "USDC" && network === "TRC20") setNetwork("ERC20");
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold transition",
              currency === item
                ? "border-accent bg-accent/15 text-accent-ink"
                : "border-tint/10 bg-tint/[0.04] text-muted hover:border-accent/40 hover:text-ink",
            )}
          >
            {item}
          </button>
        ))}
        <select
          value={network}
          onChange={(event) => setNetwork(event.target.value as Network)}
          className="rounded-md border border-tint/10 bg-background px-3 py-1 text-xs font-semibold text-ink outline-none transition focus:border-accent"
        >
          {(currency === "USDC" ? ["ERC20", "MATIC"] : ["ERC20", "TRC20", "MATIC"]).map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {(["free", "pro", "institutional"] as Plan[]).map((plan) => (
          <PlanCard key={plan} plan={plan} cadence={cadence} currency={currency} network={network} />
        ))}
      </div>
    </div>
  );
}

function CreatorView() {
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      const response = await fetch("/api/dashboard/analytics", { cache: "no-store" });
      if (!response.ok) return;
      const snapshot = (await response.json()) as DashboardSnapshot;
      if (active) {
        setAnalytics({
          thisMonthRevenue: snapshot.thisMonthRevenue ?? 0,
          totalSubscribers: snapshot.totalSubscribers ?? 0,
          revenueEstimate: snapshot.revenueEstimate ?? 0,
          memberships: snapshot.memberships ?? [],
        });
      }
    }

    void loadAnalytics();
    const interval = window.setInterval(loadAnalytics, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const activeMembers = analytics.memberships.filter((membership) => membership.status === "active").length;
  const cancelledMembers = analytics.memberships.filter((membership) => membership.status === "cancelled").length;
  const totalKnownMembers = activeMembers + cancelledMembers;
  const churnRate = totalKnownMembers > 0 ? Math.round((cancelledMembers / totalKnownMembers) * 100) : 0;
  const averageLtv = analytics.totalSubscribers > 0 ? analytics.thisMonthRevenue / analytics.totalSubscribers : 0;
  const proShare = analytics.totalSubscribers > 0 ? 100 : 0;
  const metrics = [
    { label: "MRR", value: formatCurrency(analytics.revenueEstimate), hint: "Estimated from live memberships" },
    { label: "Total Members", value: String(analytics.totalSubscribers), hint: `${activeMembers} active` },
    { label: "Churn Rate", value: `${churnRate}%`, hint: `${cancelledMembers} cancelled` },
    { label: "Avg. LTV", value: formatCurrency(averageLtv), hint: "Based on realized revenue" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{metric.label}</p>
            <p className="text-2xl font-bold text-ink">{metric.value}</p>
            <p className="mt-1 text-xs text-muted-2">{metric.hint}</p>
          </Card>
        ))}
      </div>

      <Card className="p-8 text-center">
        <p className="text-sm font-semibold text-ink">
          {analytics.totalSubscribers ? `${analytics.totalSubscribers} members` : "No members yet"}
        </p>
        <p className="mt-1 text-xs text-muted-2">
          Members update from Supabase memberships and newsletter subscriptions.
        </p>
        <Button className="mt-4" href="/membership" variant="secondary">
          Open Membership Studio
        </Button>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader>Plan Distribution</SectionHeader>
          <div className="space-y-4">
            {PLAN_DIST.map((plan) => {
              const share = plan.label === "Pro" ? proShare : 0;
              const members = plan.label === "Pro" ? analytics.totalSubscribers : 0;
              return (
                <div key={plan.label}>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-sm font-semibold text-ink">{plan.label}</span>
                    <span className="text-xs text-muted">{share}% · {members} members</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-tint/10">
                    <div className={cn("h-2 rounded-full", plan.bar)} style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader>Recent Payments</SectionHeader>
          <div className="flex h-24 items-center justify-center">
            <p className="text-xs text-muted-2">
              {analytics.thisMonthRevenue > 0
                ? `${formatCurrency(analytics.thisMonthRevenue)} recorded this month`
                : "No payment history yet"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  cadence,
  currency,
  network,
}: {
  plan: Plan;
  cadence: Cadence;
  currency: Currency;
  network: Network;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monthlyPrice = PRICES[plan][cadence];
  const annualTotal = cadence === "annual" ? monthlyPrice * 12 : null;

  async function handleUpgrade() {
    setError(null);
    setLoading(true);
    const amount = cadence === "annual" ? monthlyPrice * 12 : monthlyPrice;
    const orderId = `CB-${plan.toUpperCase()}-${Date.now()}`;

    try {
      const response = await fetch("/api/payment/nowpayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          network,
          orderId,
          membershipType: `${plan}-${cadence}`,
        }),
      });
      const data = (await response.json()) as { payment_url?: string; error?: string };
      if (!response.ok || !data.payment_url) {
        setError(data.error ?? "Payment failed. Please try again.");
        return;
      }
      window.location.href = data.payment_url;
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={cn("relative flex flex-col p-6", plan === "pro" && "border-accent/50")}>
      <p className="mb-1 font-semibold text-ink">{PLAN_LABELS[plan]}</p>
      <div className="mb-1">
        <span className="text-3xl font-bold text-ink">${monthlyPrice}</span>
        <span className="text-sm text-muted">/mo</span>
      </div>
      {annualTotal ? <p className="mb-4 text-xs text-muted-2">Billed ${annualTotal} upfront</p> : <div className="mb-4" />}
      <ul className="mb-6 flex-1 space-y-2">
        {FEATURES[plan].map((feature) => (
          <li key={feature.label} className="flex items-center gap-2 text-sm text-ink">
            <span className={feature.ok ? "text-success" : "text-muted-2"}>{feature.ok ? "✓" : "×"}</span>
            {feature.label}
          </li>
        ))}
      </ul>
      {error && (
        <p className="mb-3 rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={loading || plan === "free"}
        onClick={plan === "free" ? undefined : handleUpgrade}
        className={cn(
          "w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition",
          plan === "free"
            ? "border border-tint/10 bg-tint/[0.06] text-muted"
            : "bg-accent text-white hover:bg-accent/90 disabled:opacity-60",
        )}
      >
        {plan === "free" ? "Current plan" : loading ? "Redirecting..." : `Pay with ${currency}`}
      </button>
    </Card>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">{children}</p>
  );
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}
