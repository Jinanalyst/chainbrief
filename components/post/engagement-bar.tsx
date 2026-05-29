"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Aggregate = {
  views: number;
  likes: number;
  comments: number;
  saves: number;
  reposts: number;
  shares: number;
};

type Props = {
  targetId: string;
  initial: Aggregate;
  initialLiked?: boolean;
  initialSaved?: boolean;
  initialReposted?: boolean;
  // Endpoint accepting POST {action} — defaults to /api/posts/[id]/action
  endpoint: string;
  shareUrl?: string;
  onCommentClick?: () => void;
  // Called when the server rejects a write with 401 (not signed in).
  onAuthRequired?: () => void;
};

// Primary actions always visible; secondary actions reveal on hover (desktop)
// or via the "More" toggle (mobile/tap). All writes go to Supabase.
export function EngagementBar({
  targetId,
  initial,
  initialLiked,
  initialSaved,
  initialReposted,
  endpoint,
  shareUrl,
  onCommentClick,
  onAuthRequired,
}: Props) {
  const [counts, setCounts] = useState<Aggregate>(initial);
  const [liked, setLiked] = useState(!!initialLiked);
  const [saved, setSaved] = useState(!!initialSaved);
  const [reposted, setReposted] = useState(!!initialReposted);
  const [showMore, setShowMore] = useState(false);

  // Resync with server-provided values whenever the parent refreshes them
  // (e.g. after the live aggregate fetch or a posted comment). This keeps the
  // optimistic state honest — a failed/unauthenticated write reverts here.
  useEffect(() => {
    setCounts(initial);
  }, [initial.views, initial.likes, initial.comments, initial.saves, initial.reposts, initial.shares]);
  useEffect(() => {
    setLiked(!!initialLiked);
  }, [initialLiked]);
  useEffect(() => {
    setSaved(!!initialSaved);
  }, [initialSaved]);
  useEffect(() => {
    setReposted(!!initialReposted);
  }, [initialReposted]);

  // Returns true when the write succeeded. On 401 it triggers the auth prompt
  // so callers can revert their optimistic update.
  async function call(action: string, extra?: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
        credentials: "same-origin",
      });
      if (res.status === 401) {
        onAuthRequired?.();
        return false;
      }
      return res.ok;
    } catch {
      return false;
    }
  }

  async function toggleLike() {
    if (liked) {
      setLiked(false);
      setCounts((c) => ({ ...c, likes: Math.max(0, c.likes - 1) }));
      if (!(await call("unlike"))) {
        setLiked(true);
        setCounts((c) => ({ ...c, likes: c.likes + 1 }));
      }
    } else {
      setLiked(true);
      setCounts((c) => ({ ...c, likes: c.likes + 1 }));
      if (!(await call("like"))) {
        setLiked(false);
        setCounts((c) => ({ ...c, likes: Math.max(0, c.likes - 1) }));
      }
    }
  }
  async function toggleSave() {
    if (saved) {
      setSaved(false);
      setCounts((c) => ({ ...c, saves: Math.max(0, c.saves - 1) }));
      if (!(await call("unsave"))) {
        setSaved(true);
        setCounts((c) => ({ ...c, saves: c.saves + 1 }));
      }
    } else {
      setSaved(true);
      setCounts((c) => ({ ...c, saves: c.saves + 1 }));
      if (!(await call("save"))) {
        setSaved(false);
        setCounts((c) => ({ ...c, saves: Math.max(0, c.saves - 1) }));
      }
    }
  }
  async function toggleRepost() {
    if (reposted) {
      setReposted(false);
      setCounts((c) => ({ ...c, reposts: Math.max(0, c.reposts - 1) }));
      if (!(await call("unrepost"))) {
        setReposted(true);
        setCounts((c) => ({ ...c, reposts: c.reposts + 1 }));
      }
    } else {
      setReposted(true);
      setCounts((c) => ({ ...c, reposts: c.reposts + 1 }));
      if (!(await call("repost"))) {
        setReposted(false);
        setCounts((c) => ({ ...c, reposts: Math.max(0, c.reposts - 1) }));
      }
    }
  }
  async function share() {
    setCounts((c) => ({ ...c, shares: c.shares + 1 }));
    void call("share", { channel: "copy" });
    if (shareUrl && typeof navigator !== "undefined") {
      if (navigator.share) {
        try {
          await navigator.share({ url: shareUrl });
        } catch {
          /* user cancelled */
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
      }
    }
  }

  return (
    <div
      className="group/eng flex flex-wrap items-center gap-1.5"
      data-target-id={targetId}
    >
      <ActionButton active={liked} label={`${counts.likes}`} icon="👍" onClick={toggleLike} title="Like" />
      <ActionButton label={`${counts.comments}`} icon="💬" onClick={onCommentClick} title="Comment" />
      <ActionButton active={reposted} label={`${counts.reposts}`} icon="↺" onClick={toggleRepost} title="Repost" />
      <ActionButton label={`${counts.shares}`} icon="↗" onClick={share} title="Share" />

      <div
        className={cn(
          "flex items-center gap-1.5 transition-opacity",
          showMore ? "opacity-100" : "opacity-0 sm:opacity-0 sm:group-hover/eng:opacity-100",
        )}
      >
        <ActionButton active={saved} label={`${counts.saves}`} icon="🔖" onClick={toggleSave} title="Save" />
        <span className="rounded-full border border-tint/10 bg-tint/[0.03] px-2.5 py-1 text-[11px] text-muted-2">
          👁 {counts.views}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="ml-auto rounded-full border border-tint/10 bg-tint/[0.03] px-2 py-1 text-[11px] text-muted hover:text-ink sm:hidden"
      >
        {showMore ? "Less" : "More"}
      </button>
    </div>
  );
}

function ActionButton({
  active,
  label,
  icon,
  onClick,
  title,
}: {
  active?: boolean;
  label: string;
  icon: string;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-accent/40 bg-accent/15 text-accent-ink"
          : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/40 hover:text-ink",
      )}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
