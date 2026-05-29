"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StanceBar } from "@/components/post/stance-bar";
import { ReactionStrip, type ReactionKind } from "@/components/post/reaction-strip";
import { EngagementBar } from "@/components/post/engagement-bar";
import { formatRelativeTime } from "@/lib/i18n";

type CommentItem = {
  id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author: string | null;
  avatar_url: string | null;
};

type Aggregate = {
  percentages: { bullish: number; bearish: number; neutral: number; need_more_data: number };
  totalReactions: number;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  reposts: number;
  shares: number;
  myReaction: { reaction: ReactionKind; reasoning?: string | null } | null;
  topBull: { reasoning: string; user_id?: string }[];
  topBear: { reasoning: string; user_id?: string }[];
  commentList: CommentItem[];
};

type Props = {
  postId: string;
  shareUrl?: string;
  language?: "ko" | "en";
  // Server-rendered seed counts so the bar is populated before the live fetch.
  initial?: {
    views?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    reposts?: number;
    shares?: number;
  };
};

// Full interactive engagement surface for a community post detail page:
// live Bull/Bear stance bar, a debate reaction picker (with reasoning),
// like / comment / repost / share actions, and a live comment thread.
export function PostDetailActions({ postId, shareUrl, language = "en", initial }: Props) {
  const [agg, setAgg] = useState<Aggregate>({
    percentages: { bullish: 0, bearish: 0, neutral: 0, need_more_data: 0 },
    totalReactions: 0,
    views: initial?.views ?? 0,
    likes: initial?.likes ?? 0,
    comments: initial?.comments ?? 0,
    saves: initial?.saves ?? 0,
    reposts: initial?.reposts ?? 0,
    shares: initial?.shares ?? 0,
    myReaction: null,
    topBull: [],
    topBear: [],
    commentList: [],
  });
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/aggregate`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: CommentItem[] = Array.isArray(data.comments) ? data.comments : [];
      setAgg((prev) => ({
        ...prev,
        percentages: data.percentages,
        totalReactions: data.totalReactions,
        views: Math.max(prev.views, data.views ?? 0),
        likes: data.likes ?? prev.likes,
        comments: list.length,
        commentList: list,
        saves: data.saves ?? 0,
        reposts: data.reposts ?? 0,
        shares: data.shares ?? 0,
        myReaction: data.myReaction,
        topBull: data.topBull ?? [],
        topBear: data.topBear ?? [],
      }));
    } catch {
      /* ignore — seed counts remain */
    }
  }, [postId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitComment = useMemo(
    () => async () => {
      const text = commentDraft.trim();
      if (!text || commentSubmitting) return;
      setCommentSubmitting(true);
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "comment", body: text }),
          credentials: "same-origin",
        });
        if (res.ok) {
          setCommentDraft("");
          await refresh();
        }
      } finally {
        setCommentSubmitting(false);
      }
    },
    [commentDraft, commentSubmitting, postId, refresh],
  );

  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const resolvedShareUrl =
    shareUrl ?? (typeof window !== "undefined" ? window.location.href : undefined);

  return (
    <div className="space-y-4">
      <StanceBar
        bullish={agg.percentages.bullish}
        bearish={agg.percentages.bearish}
        neutral={agg.percentages.neutral}
        needMore={agg.percentages.need_more_data}
        total={agg.totalReactions}
      />

      {agg.topBull[0] || agg.topBear[0] ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {agg.topBull[0] ? (
            <div className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                {t("대표 강세 의견", "Top bull")}
              </p>
              <p className="mt-1 text-xs text-ink">{agg.topBull[0].reasoning}</p>
            </div>
          ) : null}
          {agg.topBear[0] ? (
            <div className="rounded-md border border-rose-400/20 bg-rose-400/[0.06] p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300">
                {t("대표 약세 의견", "Top bear")}
              </p>
              <p className="mt-1 text-xs text-ink">{agg.topBear[0].reasoning}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {t("당신의 관점", "Your stance")}
        </p>
        <ReactionStrip
          targetId={postId}
          endpoint={`/api/briefs/${encodeURIComponent(postId)}/reaction`}
          initial={agg.myReaction}
          onSubmitted={() => void refresh()}
        />
      </div>

      <div className="border-t border-tint/10 pt-3">
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
          shareUrl={resolvedShareUrl}
          onCommentClick={() => {
            const el = document.getElementById("detail-comment-input");
            el?.focus();
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      </div>

      <div className="rounded-xl border border-tint/10 bg-tint/[0.03] p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          💬 {agg.comments} {t("댓글", agg.comments === 1 ? "comment" : "comments")}
        </p>

        {agg.commentList.length === 0 ? (
          <p className="text-xs text-muted-2">
            {t("아직 댓글이 없습니다. 첫 의견을 남겨보세요.", "No comments yet. Be the first to share your take.")}
          </p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {agg.commentList.map((comment) => (
              <li className="rounded-md border border-tint/10 bg-background/60 p-2.5" key={comment.id}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-2">
                  <span className="font-semibold text-ink">
                    {comment.author?.trim() || t("회원", "Chain Brief member")}
                  </span>
                  <span>{formatRelativeTime(comment.created_at, language)}</span>
                </div>
                <p className="mt-1 break-words text-sm leading-6 text-ink">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <textarea
            id="detail-comment-input"
            className="min-h-11 w-full resize-none rounded-md border border-tint/10 bg-background px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/25"
            maxLength={1000}
            onChange={(event) => setCommentDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void submitComment();
              }
            }}
            placeholder={t("댓글을 입력하세요…", "Write a comment…")}
            rows={2}
            value={commentDraft}
          />
          <button
            className="shrink-0 rounded-md border border-accent/40 bg-accent/15 px-4 text-xs font-bold text-accent-ink transition hover:bg-accent/25 disabled:opacity-50"
            disabled={commentSubmitting || !commentDraft.trim()}
            onClick={() => void submitComment()}
            type="button"
          >
            {commentSubmitting ? t("게시 중…", "Posting…") : t("게시", "Post")}
          </button>
        </div>
      </div>
    </div>
  );
}
