"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export function FollowButton({
  targetId,
  language,
}: {
  targetId: string | null | undefined;
  language: "ko" | "en";
}) {
  const [me, setMe] = useState<string | null>(null);
  const [following, setFollowing] = useState<boolean>(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig || !targetId) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    const client = createClient();

    async function load() {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (cancelled) return;
      setMe(user?.id ?? null);
      if (!user) {
        setLoaded(true);
        return;
      }
      const res = await fetch(
        `/api/community/follow?ids=${encodeURIComponent(targetId!)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      if (cancelled) return;
      if (res.ok) {
        const data = (await res.json()) as { following?: Record<string, boolean> };
        setFollowing(Boolean(data.following?.[targetId!]));
      }
      setLoaded(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [targetId]);

  if (!targetId || !loaded) return null;
  if (me && me === targetId) return null;

  const label = following
    ? language === "ko"
      ? "팔로잉"
      : "Following"
    : language === "ko"
      ? "+ 팔로우"
      : "+ Follow";

  async function toggle() {
    if (busy || !targetId) return;
    setBusy(true);
    const optimistic = !following;
    setFollowing(optimistic);
    const res = await fetch("/api/community/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ targetId }),
    });
    if (!res.ok) {
      setFollowing(!optimistic);
    } else {
      const data = (await res.json()) as { following?: boolean };
      if (typeof data.following === "boolean") setFollowing(data.following);
    }
    setBusy(false);
  }

  return (
    <button
      aria-pressed={following}
      className={
        following
          ? "rounded-full border border-tint/20 bg-tint/[0.06] px-2.5 py-0.5 text-[0.65rem] font-bold text-muted transition hover:text-ink"
          : "rounded-full border border-accent/50 bg-accent/15 px-2.5 py-0.5 text-[0.65rem] font-bold text-accent-ink transition hover:bg-accent/25"
      }
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      type="button"
    >
      {label}
    </button>
  );
}
