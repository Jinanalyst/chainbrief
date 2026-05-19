"use client";

import { useEffect, useRef, useState } from "react";
import { ReactionStrip, type ReactionKind } from "./reaction-strip";
import { StanceBar } from "./stance-bar";

type Aggregate = {
  percentages: { bullish: number; bearish: number; neutral: number; need_more_data: number };
  totalReactions: number;
  views: number;
  comments: number;
  myReaction: { reaction: ReactionKind; reasoning?: string | null } | null;
  topBull: { reasoning: string }[];
  topBear: { reasoning: string }[];
};

const EMPTY: Aggregate = {
  percentages: { bullish: 0, bearish: 0, neutral: 0, need_more_data: 0 },
  totalReactions: 0,
  views: 0,
  comments: 0,
  myReaction: null,
  topBull: [],
  topBear: [],
};

// Live Bull/Bear reaction footer for an RSS brief.
export function BriefEngagement({ briefId }: { briefId: string }) {
  const [agg, setAgg] = useState<Aggregate>(EMPTY);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const viewedRef = useRef(false);

  async function refresh() {
    try {
      const res = await fetch(`/api/briefs/${encodeURIComponent(briefId)}/aggregate`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setAgg({
        percentages: data.percentages,
        totalReactions: data.total,
        views: data.views,
        comments: Array.isArray(data.comments) ? data.comments.length : 0,
        myReaction: data.myReaction,
        topBull: (data.topBull ?? []).map((r: { reasoning: string }) => ({ reasoning: r.reasoning })),
        topBear: (data.topBear ?? []).map((r: { reasoning: string }) => ({ reasoning: r.reasoning })),
      });
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefId]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          fetch(`/api/briefs/${encodeURIComponent(briefId)}/view`, { method: "POST" }).catch(() => undefined);
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [briefId]);

  return (
    <div ref={rootRef} className="mt-5 border-t border-tint/10 pt-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">
        What&apos;s your take?
      </p>
      <ReactionStrip
        targetId={briefId}
        endpoint={`/api/briefs/${encodeURIComponent(briefId)}/reaction`}
        initial={agg.myReaction}
        onSubmitted={() => refresh()}
      />
      <div className="mt-3">
        <StanceBar
          bullish={agg.percentages.bullish}
          bearish={agg.percentages.bearish}
          neutral={agg.percentages.neutral}
          needMore={agg.percentages.need_more_data}
          total={agg.totalReactions}
          compact
        />
      </div>
      {(agg.topBull.length || agg.topBear.length) ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {agg.topBull[0] ? (
            <div className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Top bull</p>
              <p className="mt-1 text-xs text-ink">{agg.topBull[0].reasoning}</p>
            </div>
          ) : null}
          {agg.topBear[0] ? (
            <div className="rounded-md border border-rose-400/20 bg-rose-400/[0.06] p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300">Top bear</p>
              <p className="mt-1 text-xs text-ink">{agg.topBear[0].reasoning}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-2 flex gap-3 text-[11px] text-muted-2">
        <span>👁 {agg.views}</span>
        <span>💬 {agg.comments}</span>
      </div>
    </div>
  );
}
