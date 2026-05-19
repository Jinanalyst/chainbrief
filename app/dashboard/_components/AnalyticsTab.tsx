"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/components/analyst-dashboard-view";

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  thisMonthRevenue: 0,
  totalSubscribers: 0,
  postsPublished: 0,
  totalViews: 0,
  uniqueViewers: 0,
  totalComments: 0,
  totalLikes: 0,
  bullReactions: 0,
  bearReactions: 0,
  totalBookmarks: 0,
  followerGrowth: 0,
  analystScore: 0,
  rankingPosition: null,
  revenueEstimate: 0,
  revenueBars: [],
  engagementBars: [],
  topPosts: [],
  memberships: [],
  profile: null,
  tronAddress: null,
};

export function AnalyticsTab() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSnapshot() {
      try {
        const response = await fetch("/api/dashboard/analytics", { cache: "no-store" });
        if (!response.ok) return;
        const nextSnapshot = (await response.json()) as DashboardSnapshot;
        if (active) setSnapshot({ ...EMPTY_SNAPSHOT, ...nextSnapshot });
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSnapshot();
    const interval = window.setInterval(loadSnapshot, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const maxEngagement = Math.max(...snapshot.engagementBars.map((bar) => bar.views + bar.comments + bar.likes), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Post views" value={formatCompact(snapshot.totalViews)} loading={loading} />
        <MetricCard label="Unique viewers" value={formatCompact(snapshot.uniqueViewers)} loading={loading} />
        <MetricCard label="Comments" value={formatCompact(snapshot.totalComments)} loading={loading} />
        <MetricCard label="Likes" value={formatCompact(snapshot.totalLikes)} loading={loading} />
        <MetricCard label="Bull reactions" value={formatCompact(snapshot.bullReactions)} loading={loading} />
        <MetricCard label="Bear reactions" value={formatCompact(snapshot.bearReactions)} loading={loading} />
        <MetricCard label="Saves" value={formatCompact(snapshot.totalBookmarks)} loading={loading} />
        <MetricCard label="Revenue estimate" value={formatCurrency(snapshot.revenueEstimate)} loading={loading} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
            Engagement trend
          </p>
          <div className="grid gap-3">
            {snapshot.engagementBars.length ? (
              snapshot.engagementBars.map((bar) => {
                const total = bar.views + bar.comments + bar.likes;
                return (
                  <div key={bar.label} className="grid grid-cols-[3.5rem_minmax(0,1fr)_4.5rem] items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{bar.label}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-tint/10">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max((total / maxEngagement) * 100, total > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                    <span className="text-right text-xs font-semibold text-ink">{formatCompact(total)}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted">No engagement data yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
            Analyst rank
          </p>
          <div className="grid gap-2 text-sm">
            <StatRow label="Score" value={`${snapshot.analystScore}/100`} />
            <StatRow label="Position" value={snapshot.rankingPosition ? `#${snapshot.rankingPosition}` : "Not ranked"} />
            <StatRow label="Followers" value={String(snapshot.totalSubscribers)} />
            <StatRow label="Growth" value={formatPercent(snapshot.followerGrowth)} />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
          Top posts
        </p>
        <div className="grid gap-2">
          {snapshot.topPosts.length ? (
            snapshot.topPosts.map((post, index) => (
              <div key={post.id} className="flex items-center justify-between gap-3 rounded-lg border border-tint/10 bg-tint/[0.03] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">#{index + 1} {post.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatCompact(post.views)} views · {formatCompact(post.likes)} likes · {formatCompact(post.comments)} comments
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-accent-ink">{post.score}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Publish posts to build rankings.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <Card className="p-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
      <p className="text-2xl font-bold text-ink">{loading ? "..." : value}</p>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-tint/10 bg-tint/[0.03] px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
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
