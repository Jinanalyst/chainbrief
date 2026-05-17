"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// ── Shared ───────────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">{children}</p>
  );
}

// ── USER VIEW ────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const XIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-muted-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PRICES = {
  free:          { monthly: 0,  annual: 0  },
  pro:           { monthly: 19, annual: 15 },
  institutional: { monthly: 79, annual: 63 },
} as const;

const FEATURES: Record<string, { label: string; ok: boolean }[]> = {
  free: [
    { label: "Basic market analysis",  ok: true  },
    { label: "5 articles/month",       ok: true  },
    { label: "Community access",       ok: true  },
    { label: "Real-time alerts",       ok: false },
    { label: "Advanced analytics",     ok: false },
    { label: "API access",             ok: false },
  ],
  pro: [
    { label: "Unlimited articles",     ok: true  },
    { label: "Real-time alerts",       ok: true  },
    { label: "Advanced analytics",     ok: true  },
    { label: "Community access",       ok: true  },
    { label: "Priority support",       ok: true  },
    { label: "API access",             ok: false },
  ],
  institutional: [
    { label: "Everything in Pro",      ok: true  },
    { label: "API access",             ok: true  },
    { label: "Custom reports",         ok: true  },
    { label: "Team seats (5)",         ok: true  },
    { label: "Dedicated support",      ok: true  },
    { label: "White-label option",     ok: true  },
  ],
};

type Plan = "free" | "pro" | "institutional";
const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  institutional: "Institutional",
};

function PlanCard({ plan, isAnnual }: { plan: Plan; isAnnual: boolean }) {
  const price = PRICES[plan][isAnnual ? "annual" : "monthly"];

  const borderCls =
    plan === "pro"
      ? "border-accent/50 shadow-[0_0_0_1px_rgba(47,123,255,0.3)]"
      : plan === "institutional"
      ? "border-purple-500/50 shadow-[0_0_0_1px_rgba(168,85,247,0.3)]"
      : "border-tint/10";

  const badge =
    plan === "pro"
      ? { label: "Most popular", cls: "bg-accent text-white" }
      : plan === "institutional"
      ? { label: "Enterprise", cls: "bg-purple-500 text-white" }
      : null;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border bg-surface/88 p-6 shadow-soft transition",
        borderCls,
      )}
    >
      {badge && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-bold",
            badge.cls,
          )}
        >
          {badge.label}
        </span>
      )}

      <p className="mb-1 font-semibold text-ink">{PLAN_LABELS[plan]}</p>
      <div className="mb-5">
        <span className="text-3xl font-bold text-ink">${price}</span>
        <span className="text-sm text-muted">/mo</span>
      </div>

      <ul className="mb-6 flex-1 space-y-2">
        {FEATURES[plan].map((f) => (
          <li key={f.label} className="flex items-center gap-2 text-sm text-ink">
            {f.ok ? <CheckIcon /> : <XIcon />}
            {f.label}
          </li>
        ))}
      </ul>

      <Button
        variant={plan === "pro" ? "primary" : "secondary"}
        className={cn(
          "w-full",
          plan === "institutional" && "border-purple-500/50 bg-purple-600 hover:bg-purple-500",
        )}
        type="button"
      >
        {plan === "free" ? "Get started" : "Upgrade"}
      </Button>
    </div>
  );
}

function UserView() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="space-y-6">
      {/* No active plan state */}
      <div className="flex items-center justify-between rounded-lg border border-tint/10 bg-surface/60 px-6 py-5">
        <div>
          <p className="font-semibold text-ink">No active subscription</p>
          <p className="mt-0.5 text-sm text-muted">
            Choose a plan below to unlock full access.
          </p>
        </div>
        <span className="rounded-full border border-tint/10 bg-tint/[0.06] px-3 py-1 text-xs font-semibold text-muted">
          Free
        </span>
      </div>

      {/* Monthly / Annual toggle */}
      <div className="flex items-center gap-3">
        <span className={cn("text-sm font-medium", !isAnnual ? "text-ink" : "text-muted")}>
          Monthly
        </span>
        <button
          type="button"
          onClick={() => setIsAnnual((a) => !a)}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            isAnnual ? "bg-accent" : "bg-tint/20",
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
              isAnnual ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
        <span className={cn("text-sm font-medium", isAnnual ? "text-ink" : "text-muted")}>
          Annual
        </span>
        {isAnnual && (
          <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
            Save 20%
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-3 gap-5 pt-2">
        {(["free", "pro", "institutional"] as Plan[]).map((p) => (
          <PlanCard key={p} plan={p} isAnnual={isAnnual} />
        ))}
      </div>

      {/* Billing info — empty state */}
      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionHeader>Billing Details</SectionHeader>
          <p className="text-sm text-muted">No billing information yet.</p>
          <p className="mt-1 text-xs text-muted-2">
            Billing details will appear here once you subscribe to a plan.
          </p>
        </Card>

        <Card className="p-5">
          <SectionHeader>Usage This Month</SectionHeader>
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 flex justify-between">
                <span className="text-xs text-muted">Articles read</span>
                <span className="text-xs font-semibold text-ink">0 / 5</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-tint/10">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: "0%" }} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between">
                <span className="text-xs text-muted">Analyses posted</span>
                <span className="text-xs font-semibold text-ink">0 / –</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-tint/10">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: "0%" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── CREATOR VIEW ─────────────────────────────────────────────────────────────

const METRICS = [
  { label: "MRR",           value: "—",   change: null },
  { label: "Total Members", value: "0",   change: null },
  { label: "Churn Rate",    value: "—",   change: null },
  { label: "Avg. LTV",      value: "—",   change: null },
];

const PLAN_DIST = [
  { label: "Free",          pct: 0, count: 0, bar: "bg-muted-2"    },
  { label: "Pro",           pct: 0, count: 0, bar: "bg-accent"     },
  { label: "Institutional", pct: 0, count: 0, bar: "bg-purple-500" },
];

function CreatorView() {
  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <Card key={m.label} className="p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{m.label}</p>
            <p className="text-2xl font-bold text-ink">{m.value}</p>
            <p className="mt-1 text-xs text-muted-2">No data yet</p>
          </Card>
        ))}
      </div>

      {/* Members — empty state */}
      <Card className="p-8 text-center">
        <svg
          className="mx-auto mb-3 h-10 w-10 text-muted-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-sm font-semibold text-ink">No members yet</p>
        <p className="mt-1 text-xs text-muted-2">
          Members will appear here once your membership plans are live.
        </p>
        <Button className="mt-4" href="/membership" variant="secondary">
          Open Membership Studio →
        </Button>
      </Card>

      {/* Bottom 2-col */}
      <div className="grid grid-cols-2 gap-5">
        {/* Plan distribution */}
        <Card className="p-5">
          <SectionHeader>Plan Distribution</SectionHeader>
          <div className="space-y-4">
            {PLAN_DIST.map((p) => (
              <div key={p.label}>
                <div className="mb-1.5 flex justify-between">
                  <span className="text-sm font-semibold text-ink">{p.label}</span>
                  <span className="text-xs text-muted">0% · 0 members</span>
                </div>
                <div className="h-2 w-full rounded-full bg-tint/10">
                  <div
                    className={cn("h-2 rounded-full", p.bar)}
                    style={{ width: "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent payments */}
        <Card className="p-5">
          <SectionHeader>Recent Payments</SectionHeader>
          <div className="flex h-24 items-center justify-center">
            <p className="text-xs text-muted-2">No payment history yet</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── MembershipTab ─────────────────────────────────────────────────────────────

export function MembershipTab({ showToast: _showToast }: { showToast: (msg: string) => void }) {
  const [view, setView] = useState<"user" | "creator">("user");

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Membership</h2>
        <div className="flex gap-1 rounded-lg border border-tint/10 bg-tint/[0.04] p-1">
          {(["user", "creator"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition",
                view === v
                  ? "bg-surface-2 text-ink shadow-soft"
                  : "text-muted hover:text-ink",
              )}
            >
              {v === "creator" ? "Creator" : "User"}
            </button>
          ))}
        </div>
      </div>

      {view === "user"    && <UserView />}
      {view === "creator" && <CreatorView />}
    </div>
  );
}
