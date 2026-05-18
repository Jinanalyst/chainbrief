"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

type Currency = "USDT" | "USDC";
type Network  = "ERC20" | "TRC20" | "MATIC";
type Plan     = "free" | "pro" | "institutional";
type Cadence  = "monthly" | "annual";

// ── Shared ───────────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">{children}</p>
  );
}

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

const SpinnerIcon = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ── Data ──────────────────────────────────────────────────────────────────────

const PRICES: Record<Plan, Record<Cadence, number>> = {
  free:          { monthly: 0,  annual: 0   },
  pro:           { monthly: 19, annual: 15  },
  institutional: { monthly: 79, annual: 63  },
};

const FEATURES: Record<Plan, { label: string; ok: boolean }[]> = {
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

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  institutional: "Institutional",
};

const NETWORK_LABELS: Record<Network, string> = {
  ERC20: "Ethereum (ERC-20)",
  TRC20: "Tron (TRC-20)",
  MATIC: "Polygon (MATIC)",
};

// ── Payment helper ────────────────────────────────────────────────────────────

async function startPayment({
  plan,
  cadence,
  currency,
  network,
}: {
  plan: Plan;
  cadence: Cadence;
  currency: Currency;
  network: Network;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const monthlyPrice = PRICES[plan][cadence];
  // For annual billing, charge the full year upfront (monthly × 12)
  const amount = cadence === "annual" ? monthlyPrice * 12 : monthlyPrice;
  const orderId = `CB-${plan.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  try {
    const res = await fetch("/api/payment/nowpayments", {
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

    const data = (await res.json()) as { payment_url?: string; error?: string };

    if (!res.ok || !data.payment_url) {
      return { ok: false, error: data.error ?? "Payment failed. Please try again." };
    }

    return { ok: true, url: data.payment_url };
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }
}

// ── PlanCard ──────────────────────────────────────────────────────────────────

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
  const [error, setError]     = useState<string | null>(null);

  const monthlyPrice = PRICES[plan][cadence];
  const annualTotal  = cadence === "annual" ? monthlyPrice * 12 : null;

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
      ? { label: "Enterprise",   cls: "bg-purple-500 text-white" }
      : null;

  async function handleUpgrade() {
    setError(null);
    setLoading(true);
    const result = await startPayment({ plan, cadence, currency, network });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    window.location.href = result.url;
  }

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

      <div className="mb-1">
        <span className="text-3xl font-bold text-ink">${monthlyPrice}</span>
        <span className="text-sm text-muted">/mo</span>
      </div>
      {annualTotal && (
        <p className="mb-4 text-xs text-muted-2">Billed ${annualTotal} upfront</p>
      )}
      {!annualTotal && <div className="mb-4" />}

      <ul className="mb-6 flex-1 space-y-2">
        {FEATURES[plan].map((f) => (
          <li key={f.label} className="flex items-center gap-2 text-sm text-ink">
            {f.ok ? <CheckIcon /> : <XIcon />}
            {f.label}
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
        onClick={plan !== "free" ? handleUpgrade : undefined}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
          plan === "free"
            ? "border border-tint/10 bg-tint/[0.06] text-muted cursor-default"
            : plan === "pro"
            ? "bg-accent text-white hover:bg-accent/90 disabled:opacity-60"
            : "border border-purple-500/50 bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-60",
        )}
      >
        {loading && <SpinnerIcon />}
        {plan === "free" ? "Current plan" : loading ? "Redirecting…" : `Pay with ${currency}`}
      </button>
    </div>
  );
}

// ── CryptoSelector ────────────────────────────────────────────────────────────

function CryptoSelector({
  currency,
  network,
  onCurrencyChange,
  onNetworkChange,
}: {
  currency: Currency;
  network: Network;
  onCurrencyChange: (c: Currency) => void;
  onNetworkChange: (n: Network) => void;
}) {
  const availableNetworks: Network[] =
    currency === "USDC" ? ["ERC20", "MATIC"] : ["ERC20", "TRC20", "MATIC"];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-tint/10 bg-tint/[0.03] px-4 py-3">
      <span className="text-xs font-semibold text-muted">Pay with</span>

      {/* Currency pills */}
      <div className="flex gap-1.5">
        {(["USDT", "USDC"] as Currency[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              onCurrencyChange(c);
              // Reset to ERC20 if current network not supported
              if (c === "USDC" && network === "TRC20") onNetworkChange("ERC20");
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold transition",
              currency === c
                ? "border-accent bg-accent/15 text-accent-ink"
                : "border-tint/10 bg-tint/[0.04] text-muted hover:border-accent/40 hover:text-ink",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <span className="text-xs text-muted-2">on</span>

      {/* Network dropdown */}
      <select
        value={network}
        onChange={(e) => onNetworkChange(e.target.value as Network)}
        className="rounded-md border border-tint/10 bg-background px-3 py-1 text-xs font-semibold text-ink outline-none transition focus:border-accent"
      >
        {availableNetworks.map((n) => (
          <option key={n} value={n}>{NETWORK_LABELS[n]}</option>
        ))}
      </select>
    </div>
  );
}

// ── USER VIEW ─────────────────────────────────────────────────────────────────

function UserView() {
  const [cadence,  setCadence]  = useState<Cadence>("monthly");
  const [currency, setCurrency] = useState<Currency>("USDT");
  const [network,  setNetwork]  = useState<Network>("ERC20");

  return (
    <div className="space-y-6">
      {/* Current plan status */}
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

      {/* Billing cadence toggle */}
      <div className="flex items-center gap-3">
        <span className={cn("text-sm font-medium", cadence === "monthly" ? "text-ink" : "text-muted")}>
          Monthly
        </span>
        <button
          type="button"
          onClick={() => setCadence((c) => c === "monthly" ? "annual" : "monthly")}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            cadence === "annual" ? "bg-accent" : "bg-tint/20",
          )}
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

      {/* Crypto selector */}
      <CryptoSelector
        currency={currency}
        network={network}
        onCurrencyChange={setCurrency}
        onNetworkChange={setNetwork}
      />

      {/* Plan cards */}
      <div className="grid grid-cols-3 gap-5 pt-2">
        {(["free", "pro", "institutional"] as Plan[]).map((p) => (
          <PlanCard
            key={p}
            plan={p}
            cadence={cadence}
            currency={currency}
            network={network}
          />
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

// ── CREATOR VIEW ──────────────────────────────────────────────────────────────

const METRICS = [
  { label: "MRR",           value: "—" },
  { label: "Total Members", value: "0" },
  { label: "Churn Rate",    value: "—" },
  { label: "Avg. LTV",      value: "—" },
];

const PLAN_DIST = [
  { label: "Free",          bar: "bg-muted-2"    },
  { label: "Pro",           bar: "bg-accent"     },
  { label: "Institutional", bar: "bg-purple-500" },
];

function CreatorView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <Card key={m.label} className="p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{m.label}</p>
            <p className="text-2xl font-bold text-ink">{m.value}</p>
            <p className="mt-1 text-xs text-muted-2">No data yet</p>
          </Card>
        ))}
      </div>

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

      <div className="grid grid-cols-2 gap-5">
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
                  <div className={cn("h-2 rounded-full", p.bar)} style={{ width: "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

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
