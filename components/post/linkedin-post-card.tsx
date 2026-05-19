"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { MediaCarousel, type MediaItem } from "./media-carousel";
import { StanceBar } from "./stance-bar";
import { ReactionStrip, type ReactionKind } from "./reaction-strip";
import { EngagementBar } from "./engagement-bar";
import { AnalystChip, type AnalystTier } from "./analyst-chip";

export type StanceLabel = "Bullish" | "Bearish" | "Neutral" | "Question" | "Need More Data";

export type LinkedInPostCardProps = {
  postId: string;
  author: {
    name: string;
    avatarUrl?: string | null;
    handle?: string | null;
    tier?: AnalystTier | null;
    score?: number | null;
  };
  publishedAt: string;
  opinion: string;
  assetTags?: string[];
  stance?: StanceLabel | null;
  media?: MediaItem[];
  // Initial values (server-rendered if available)
  initial?: {
    views?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    reposts?: number;
    shares?: number;
    liked?: boolean;
    saved?: boolean;
    reposted?: boolean;
    bullishPct?: number;
    bearishPct?: number;
    neutralPct?: number;
    needMorePct?: number;
    totalReactions?: number;
    myReaction?: { reaction: ReactionKind; reasoning?: string | null } | null;
  };
  shareUrl?: string;
  // If true, fetches live aggregate from /api/posts/[id]/aggregate on mount.
  fetchLive?: boolean;
  className?: string;
};

const STANCE_TONE: Record<string, string> = {
  Bullish: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  Bearish: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  Neutral: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  Question: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  "Need More Data": "border-amber-400/40 bg-amber-400/10 text-amber-200",
};

// LinkedIn-style market-analysis card.
// Funnel: opinion (Bull/Bear stance) → community reaction strip → engagement → live stance%.
export function LinkedInPostCard(props: LinkedInPostCardProps) {
  const {
    postId,
    author,
    publishedAt,
    opinion,
    assetTags = [],
    stance,
    media = [],
    initial,
    shareUrl,
    fetchLive = true,
    className,
  } = props;

  type Aggregate = {
    counts: { bullish: number; bearish: number; neutral: number; need_more_data: number };
    percentages: { bullish: number; bearish: number; neutral: number; need_more_data: number };
    totalReactions: number;
    views: number;
    likes: number;
    comments: number;
    saves: number;
    reposts: number;
    shares: number;
    myReaction: { reaction: ReactionKind; reasoning?: string | null } | null;
  };

  const [agg, setAgg] = useState<Aggregate>(() => ({
    counts: { bullish: 0, bearish: 0, neutral: 0, need_more_data: 0 },
    percentages: {
      bullish: initial?.bullishPct ?? 0,
      bearish: initial?.bearishPct ?? 0,
      neutral: initial?.neutralPct ?? 0,
      need_more_data: initial?.needMorePct ?? 0,
    },
    totalReactions: initial?.totalReactions ?? 0,
    views: initial?.views ?? 0,
    likes: initial?.likes ?? 0,
    comments: initial?.comments ?? 0,
    saves: initial?.saves ?? 0,
    reposts: initial?.reposts ?? 0,
    shares: initial?.shares ?? 0,
    myReaction: initial?.myReaction ?? null,
  }));

  // Record a view once when the card scrolls into view.
  const viewedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!fetchLive) return;
    let cancelled = false;
    fetch(`/api/posts/${encodeURIComponent(postId)}/aggregate`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setAgg((prev) => ({
          ...prev,
          counts: data.counts,
          percentages: data.percentages,
          totalReactions: data.totalReactions,
          views: data.views,
          likes: data.likes,
          comments: Array.isArray(data.comments) ? data.comments.length : data.comments ?? 0,
          saves: data.saves,
          reposts: data.reposts,
          shares: data.shares,
          myReaction: data.myReaction,
        }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [postId, fetchLive]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          fetch(`/api/posts/${encodeURIComponent(postId)}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "view" }),
          }).catch(() => undefined);
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [postId]);

  const tier = author.tier ?? "user";
  const formattedTime = formatRelative(publishedAt);

  return (
    <div ref={rootRef} className="min-w-0">
    <Card className={cn("group/card min-w-0 p-4 sm:p-5", className)} as="article">
      <header className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-tint/10 bg-tint/[0.04]">
          {author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatarUrl} alt={author.name} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-sm font-bold text-ink">
              {author.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold text-ink">{author.name}</p>
            <AnalystChip tier={tier as AnalystTier} score={author.score} compact />
            {author.handle ? (
              <span className="text-[11px] text-muted-2">@{author.handle}</span>
            ) : null}
            <span className="text-[11px] text-muted-2">· {formattedTime}</span>
          </div>
          {stance ? (
            <div className="mt-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  STANCE_TONE[stance] ?? "border-tint/10 bg-tint/[0.04] text-muted",
                )}
              >
                {stance}
              </span>
            </div>
          ) : null}
        </div>
      </header>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{opinion}</p>

      {assetTags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {assetTags.map((tag) => (
            <Badge key={tag} tone="muted">#{tag}</Badge>
          ))}
        </div>
      ) : null}

      {media.length ? (
        <div className="mt-4">
          <MediaCarousel items={media} />
        </div>
      ) : null}

      <div className="mt-4">
        <StanceBar
          bullish={agg.percentages.bullish}
          bearish={agg.percentages.bearish}
          neutral={agg.percentages.neutral}
          needMore={agg.percentages.need_more_data}
          total={agg.totalReactions}
        />
      </div>

      <div className="mt-3">
        <ReactionStrip
          targetId={postId}
          endpoint={`/api/briefs/${encodeURIComponent(postId)}/reaction`}
          initial={agg.myReaction}
          onSubmitted={() => {
            // Refresh aggregate after reacting
            fetch(`/api/posts/${encodeURIComponent(postId)}/aggregate`, { cache: "no-store" })
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (!data) return;
                setAgg((prev) => ({
                  ...prev,
                  counts: data.counts,
                  percentages: data.percentages,
                  totalReactions: data.totalReactions,
                  myReaction: data.myReaction,
                }));
              })
              .catch(() => undefined);
          }}
        />
      </div>

      <div className="mt-4 border-t border-tint/10 pt-3">
        <EngagementBar
          targetId={postId}
          endpoint={`/api/posts/${encodeURIComponent(postId)}/action`}
          initial={{
            views: agg.views,
            likes: agg.likes,
            comments: agg.comments,
            saves: agg.saves,
            reposts: agg.reposts,
            shares: agg.shares,
          }}
          initialLiked={initial?.liked}
          initialSaved={initial?.saved}
          initialReposted={initial?.reposted}
          shareUrl={shareUrl}
        />
      </div>
    </Card>
    </div>
  );
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Math.max(0, Date.now() - d.getTime());
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}
