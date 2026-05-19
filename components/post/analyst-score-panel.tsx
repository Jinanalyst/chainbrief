"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AnalystChip, type AnalystTier } from "./analyst-chip";

type LiveAnalystScore = {
  engagement_score: number;
  consistency_score: number;
  risk_score: number;
  invalidation_score: number;
  trust_score: number;
  total_score: number;
  tier: AnalystTier;
};

// Live analyst score panel for profile/analyst pages.
// Reads from /api/analyst/score (Supabase view). No mock data — zeros until activity exists.
export function AnalystScorePanel({
  userId,
  compact = false,
  title = "Analyst Score",
}: {
  userId?: string | null;
  compact?: boolean;
  title?: string;
}) {
  const [score, setScore] = useState<LiveAnalystScore | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const url = userId
      ? `/api/analyst/score?userId=${encodeURIComponent(userId)}`
      : `/api/analyst/score`;
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setLoaded(true);
        if (data?.score) setScore(data.score as LiveAnalystScore);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const rows: Array<readonly [string, number]> = [
    ["Engagement", score?.engagement_score ?? 0],
    ["Reasoning (consistency)", score?.consistency_score ?? 0],
    ["Risk-aware writing", score?.risk_score ?? 0],
    ["Invalidation discipline", score?.invalidation_score ?? 0],
    ["Community trust", score?.trust_score ?? 0],
  ];

  return (
    <Card className={compact ? "p-3" : "p-4 sm:p-5"}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">{title}</p>
          <div className="mt-1.5">
            <AnalystChip tier={(score?.tier ?? "rookie_analyst") as AnalystTier} score={score?.total_score ?? 0} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-ink">{score?.total_score ?? 0}</span>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-2">/100</p>
        </div>
      </div>
      <div className={compact ? "mt-3 grid gap-2" : "mt-4 grid gap-3"}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-muted">{label}</span>
              <span className="font-semibold text-accent-ink">{value}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-tint/10">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, value)}%` }} />
            </div>
          </div>
        ))}
      </div>
      {loaded && !score ? (
        <p className="mt-3 text-[11px] text-muted-2">
          No activity yet. React on briefs, write reasoning with risk and invalidation levels to build your score.
        </p>
      ) : null}
    </Card>
  );
}
