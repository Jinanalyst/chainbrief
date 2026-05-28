"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
import { saveAnalystDashboardSettingsAction, saveWithdrawAddressAction } from "@/lib/analyst-actions";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

// Types mirrored from analyst-data so this stays a pure client file.

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
export type EngagementBar = { label: string; views: number; comments: number; likes: number };
export type TopPost = {
  id: string;
  title: string;
  views: number;
  comments: number;
  likes: number;
  bookmarks: number;
  bull: number;
  bear: number;
  rebriefs: number;
  quoteAnalyses: number;
  score: number;
};

export type DashboardSnapshot = {
  thisMonthRevenue: number;
  totalSubscribers: number;
  postsPublished: number;
  totalViews: number;
  uniqueViewers: number;
  totalComments: number;
  totalLikes: number;
  bullReactions: number;
  bearReactions: number;
  totalBookmarks: number;
  totalRebriefs: number;
  totalQuoteAnalyses: number;
  followerGrowth: number;
  analystScore: number;
  rankingPosition: number | null;
  revenueEstimate: number;
  revenueBars: RevenueBar[];
  engagementBars: EngagementBar[];
  topPosts: TopPost[];
  memberships: MembershipRow[];
  profile: AnalystProfileRow;
  tronAddress: string | null;
};

// Main view.

export function AnalystDashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [preferences] = usePreferences();
  const { t: copy } = useI18n(preferences.language);
  const d = copy.dashboard;
  const searchParams = useSearchParams();
  const router = useRouter();

  const saved = searchParams.get("saved") === "1";
  const errorParam = searchParams.get("error");

  const maxRevenue = Math.max(...snapshot.revenueBars.map((bar) => bar.amount), 0, 1);
  const maxEngagement = Math.max(...snapshot.engagementBars.map((bar) => bar.views + bar.comments + bar.likes), 1);
  const totalReactions = snapshot.bullReactions + snapshot.bearReactions;
  const bullShare = totalReactions > 0 ? Math.round((snapshot.bullReactions / totalReactions) * 100) : 0;

  // Auto-dismiss the saved banner
  const [showSaved, setShowSaved] = useState(saved);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setShowSaved(false), 4000);
    return () => clearTimeout(t);
  }, [saved]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const supabase = createClient();
    const channel = supabase
      .channel("analyst-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "analyst_memberships" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "revenue_events" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "analyst_scores" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_views" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_bookmarks" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_reactions" }, () => router.refresh())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">

      {/* Header card */}
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

      {/* Feedback banners */}
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

      {/* Metric cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label={d.thisMonthRevenue} value={formatCurrency(snapshot.thisMonthRevenue)} />
        <MetricCard label={d.totalSubscribers} value={String(snapshot.totalSubscribers)} />
        <MetricCard label={d.postsPublished} value={String(snapshot.postsPublished)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Post views" value={formatCompact(snapshot.totalViews)} />
        <MetricCard label="Unique viewers" value={formatCompact(snapshot.uniqueViewers)} />
        <MetricCard label="Comments" value={formatCompact(snapshot.totalComments)} />
        <MetricCard label="Likes" value={formatCompact(snapshot.totalLikes)} />
        <MetricCard label="Bull reactions" value={formatCompact(snapshot.bullReactions)} />
        <MetricCard label="Bear reactions" value={formatCompact(snapshot.bearReactions)} />
        <MetricCard label="Saves" value={formatCompact(snapshot.totalBookmarks)} />
        <MetricCard label="Rebriefs" value={formatCompact(snapshot.totalRebriefs)} />
        <MetricCard label="Quote analysis" value={formatCompact(snapshot.totalQuoteAnalyses)} />
        <MetricCard label="Follower growth" value={formatPercent(snapshot.followerGrowth)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Live analytics
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink">Views, comments, and likes</h2>
            </div>
            <div className="rounded-md border border-tint/10 bg-tint/[0.03] px-3 py-2 text-sm text-muted">
              Realtime
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {snapshot.engagementBars.map((bar) => {
              const total = bar.views + bar.comments + bar.likes;
              return (
                <div key={bar.label} className="grid grid-cols-[3.5rem_minmax(0,1fr)_5.5rem] items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {bar.label}
                  </span>
                  <div className="h-3 overflow-hidden rounded-full bg-tint/10">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max((total / maxEngagement) * 100, total > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                  <span className="text-right text-xs font-semibold text-ink">
                    {formatCompact(total)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Ranking
          </p>
          <div className="mt-4 grid gap-3">
            <StatRow label="Analyst score" value={`${snapshot.analystScore}/100`} />
            <StatRow
              label="Rank position"
              value={snapshot.rankingPosition ? `#${snapshot.rankingPosition}` : "Not ranked"}
            />
            <StatRow label="Revenue estimate" value={formatCurrency(snapshot.revenueEstimate)} />
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
              <span>Bull/Bear split</span>
              <span>{totalReactions ? `${bullShare}% Bull` : "No reactions"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-rose-400/30">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${bullShare}%` }} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_20rem]">
        <div className="grid gap-6">

          {/* Membership settings form */}
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

          {/* Revenue chart */}
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

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Rankings
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink">Top posts by engagement</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              {snapshot.topPosts.length ? (
                snapshot.topPosts.map((post, index) => (
                  <div key={post.id} className="grid gap-2 rounded-xl border border-tint/10 bg-tint/[0.03] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-semibold text-ink">
                        #{index + 1} {post.title}
                      </p>
                      <span className="shrink-0 text-xs font-semibold text-accent-ink">
                        {post.score}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      <span>{formatCompact(post.views)} views</span>
                      <span>{formatCompact(post.comments)} comments</span>
                      <span>{formatCompact(post.likes)} likes</span>
                      <span>{formatCompact(post.bookmarks)} saves</span>
                      <span>{formatCompact(post.rebriefs)} rebriefs</span>
                      <span>{formatCompact(post.quoteAnalyses)} quotes</span>
                      <span>{post.bull}/{post.bear} Bull/Bear</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted">Publish posts to build a live ranking.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
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
              <Button href="/analytics/status" variant="secondary">{d.status}</Button>
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

// Sub-components.

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

// Formatters.

function formatCurrency(value: number | string) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

function formatPercent(value: number) {
  const amount = Number(value) || 0;
  return `${amount > 0 ? "+" : ""}${amount}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

function shortId(value: string) {
  return `${value.slice(0, 8)}...`;
}

