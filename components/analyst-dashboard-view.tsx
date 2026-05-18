"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
import { saveAnalystDashboardSettingsAction, saveWithdrawAddressAction } from "@/lib/analyst-actions";

// ── Types (mirrored from analyst-data so this stays a pure client file) ────────

export type AnalystProfileRow = {
  analyst_id: string;
  membership_enabled: boolean;
  membership_price_usd: number;
  membership_description: string;
  slug?: string | null;
  tron_usdt_address?: string | null;
  updated_at: string;
} | null;

export type MembershipRow = {
  id: string;
  analyst_id: string;
  subscriber_user_id: string;
  started_at: string;
  cancelled_at: string | null;
  status: string;
  subscriber_profile: { username: string | null; avatar_url: string | null } | null;
};

export type RevenueBar = { label: string; amount: number };

export type DashboardSnapshot = {
  thisMonthRevenue: number;
  totalSubscribers: number;
  postsPublished: number;
  revenueBars: RevenueBar[];
  memberships: MembershipRow[];
  profile: AnalystProfileRow;
  tronAddress: string | null;
};

// ── Main view ──────────────────────────────────────────────────────────────────

export function AnalystDashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [preferences] = usePreferences();
  const { t: copy } = useI18n(preferences.language);
  const d = copy.dashboard;
  const searchParams = useSearchParams();

  const saved = searchParams.get("saved") === "1";
  const errorParam = searchParams.get("error");

  const maxRevenue = Math.max(...snapshot.revenueBars.map((bar) => bar.amount), 0, 1);

  // Auto-dismiss the saved banner
  const [showSaved, setShowSaved] = useState(saved);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setShowSaved(false), 4000);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">

      {/* ── Header card ── */}
      <Card className="min-w-0 p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {d.eyebrow}
          </p>
          <div className="shrink-0 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-success">
            {d.verifiedBadge}
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{d.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{d.description}</p>
      </Card>

      {/* ── Feedback banners ── */}
      {showSaved && (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-300">
          {d.settingsSaved}
        </div>
      )}
      {errorParam && (
        <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-300">
          {errorParam === "price" ? d.priceError : d.settingsSaved}
        </div>
      )}

      {/* ── Metric cards ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label={d.thisMonthRevenue} value={formatCurrency(snapshot.thisMonthRevenue)} />
        <MetricCard label={d.totalSubscribers} value={String(snapshot.totalSubscribers)} />
        <MetricCard label={d.postsPublished} value={String(snapshot.postsPublished)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_20rem]">
        <div className="grid gap-6">

          {/* ── Membership settings form ── */}
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {d.revenueModel}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink">
                  {d.monthlyMembershipRevenue}
                </h2>
              </div>
              <div className="rounded-md border border-tint/10 bg-tint/[0.03] px-3 py-2 text-sm text-muted">
                {d.revenueSplit}
              </div>
            </div>

            <form className="mt-5 grid gap-4" action={saveAnalystDashboardSettingsAction}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-tint/10 bg-tint/[0.03] px-4 py-3 transition hover:bg-tint/[0.06]">
                <input
                  defaultChecked={snapshot.profile?.membership_enabled ?? false}
                  name="membership_enabled"
                  type="checkbox"
                  className="h-4 w-4 accent-accent"
                />
                <div>
                  <p className="text-sm font-semibold text-ink">{d.enableMembership}</p>
                  <p className="text-xs leading-5 text-muted">{d.enableMembershipDesc}</p>
                </div>
              </label>

              {/* Keep the current price without an editable field */}
              <input type="hidden" name="membership_price_usd" value={snapshot.profile?.membership_price_usd ?? 1} />

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {d.membershipDescription}
                </span>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-md border border-tint/10 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  defaultValue={snapshot.profile?.membership_description ?? ""}
                  name="membership_description"
                  placeholder={d.membershipDescriptionPlaceholder}
                />
              </label>

              <Button type="submit">{d.saveSettings}</Button>
            </form>
          </Card>

          {/* ── Revenue chart ── */}
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {d.monthlyRevenue}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink">{d.last6Months}</h2>
              </div>
              <Button href="/community/write" variant="secondary">
                {d.writePost}
              </Button>
            </div>

            <div className="mt-5 grid gap-3">
              {snapshot.revenueBars.map((bar) => (
                <div
                  key={bar.label}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)_4rem] items-center gap-3"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {bar.label}
                  </span>
                  <div className="h-3 overflow-hidden rounded-full bg-tint/10">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max((bar.amount / maxRevenue) * 100, 6)}%` }}
                    />
                  </div>
                  <span className="text-right text-xs font-semibold text-ink">
                    {formatCurrency(bar.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {d.membershipMembers}
            </p>
            <div className="mt-3 grid gap-2">
              {snapshot.memberships.length ? (
                snapshot.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="rounded-xl border border-tint/10 bg-tint/[0.03] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">
                        {membership.subscriber_profile?.username || shortId(membership.subscriber_user_id)}
                      </p>
                      <span className="rounded-full border border-tint/10 bg-tint/[0.03] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                        {membership.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      {d.started} {formatDate(membership.started_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted">{d.noMembers}</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {d.analystSnapshot}
            </p>
            <div className="mt-3 grid gap-2 text-sm">
              <StatRow
                label={d.membershipStatus}
                value={snapshot.profile?.membership_enabled ? d.membershipEnabled : d.membershipDisabled}
              />
              <StatRow
                label={d.descriptionLabel}
                value={snapshot.profile?.membership_description || d.notSet}
              />
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {d.nextSteps}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">{d.nextStepsText}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button href="/community/write">{d.writeNow}</Button>
              <Button href="/analyst/status" variant="secondary">{d.status}</Button>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {d.withdrawSection}
            </p>
            <div className="mt-3 rounded-xl border border-tint/10 bg-tint/[0.03] px-3 py-2.5">
              <p className="text-xs text-muted">{d.withdrawBalance}</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {formatCurrency(snapshot.thisMonthRevenue)}
              </p>
            </div>
            <form className="mt-3 grid gap-3" action={saveWithdrawAddressAction}>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {d.tronAddress}
                </span>
                <input
                  className="mt-2 min-h-10 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                  defaultValue={snapshot.tronAddress ?? ""}
                  name="tron_usdt_address"
                  placeholder={d.tronAddressPlaceholder}
                />
              </label>
              <Button type="submit" variant="secondary">{d.requestWithdraw}</Button>
            </form>
            <p className="mt-3 text-xs leading-5 text-muted">{d.withdrawNote}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-tint/10 bg-tint/[0.03] px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number | string) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

function shortId(value: string) {
  return `${value.slice(0, 8)}…`;
}
