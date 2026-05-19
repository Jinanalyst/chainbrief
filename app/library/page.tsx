"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { FollowButton } from "@/components/post/follow-button";
import {
  communityPostFromDatabase,
  type CommunityPost,
  type DatabaseCommunityPostRow,
} from "@/lib/community";
import { formatRelativeTime } from "@/lib/i18n";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type LibraryTab = "saved" | "liked" | "rebriefed" | "comments" | "reading" | "following";

type FollowedProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
};

const TABS: LibraryTab[] = ["saved", "liked", "rebriefed", "comments", "reading", "following"];

const POST_SELECT =
  "id, author_id, title, body, category, post_type, coin_tags, linked_news_id, quoted_post_id, quote_kind, metadata, status, view_count, created_at, updated_at, profiles(username, avatar_url, role), post_attachments(id, kind, name, mime_type, data_url, size, position)";

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryView />
    </Suspense>
  );
}

function LibraryView() {
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const initialTab: LibraryTab = (TABS as string[]).includes(tabParam ?? "")
    ? (tabParam as LibraryTab)
    : "saved";
  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [preferences] = usePreferences();
  const { language } = useI18n(preferences.language);
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [followed, setFollowed] = useState<FollowedProfile[]>([]);
  const [status, setStatus] = useState<"loading" | "signed-out" | "ready">("loading");

  useEffect(() => {
    if (tabParam && (TABS as string[]).includes(tabParam)) {
      setTab(tabParam as LibraryTab);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!supabase) {
      setStatus("signed-out");
      return;
    }
    let cancelled = false;
    const client = supabase;

    async function load() {
      setStatus("loading");
      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setPosts([]);
          setFollowed([]);
          setStatus("signed-out");
        }
        return;
      }

      if (tab === "following") {
        const { data: rows } = await client
          .from("profile_follows")
          .select("followed_id, created_at, profiles:followed_id(id, username, avatar_url, role)")
          .eq("follower_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);
        if (cancelled) return;
        const list: FollowedProfile[] = (rows ?? [])
          .map((row) => {
            const p = (row as { profiles?: FollowedProfile | FollowedProfile[] | null }).profiles;
            const profile = Array.isArray(p) ? p[0] : p;
            return profile ?? null;
          })
          .filter((p): p is FollowedProfile => Boolean(p));
        setFollowed(list);
        setPosts([]);
        setStatus("ready");
        return;
      }

      const postIds = await fetchPostIdsForTab(client, tab, user.id);
      if (cancelled) return;
      if (postIds.length === 0) {
        setPosts([]);
        setStatus("ready");
        return;
      }

      const { data: postRows } = await client
        .from("posts")
        .select(POST_SELECT)
        .in("id", postIds)
        .eq("status", "published");
      if (cancelled) return;

      const order = new Map(postIds.map((id, i) => [id, i] as const));
      const mapped = ((postRows ?? []) as DatabaseCommunityPostRow[])
        .map(communityPostFromDatabase)
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      setPosts(mapped);
      setStatus("ready");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, tab]);

  const heading = language === "ko" ? "라이브러리" : "Library";
  const subtitle =
    language === "ko"
      ? "저장하거나 좋아요한 글, 리브리프, 댓글, 읽은 기록, 그리고 팔로우한 분석가를 한 곳에서 볼 수 있어요."
      : "Your saved, liked, rebriefed, commented, read posts and followed analysts — all in one place.";

  const showEmpty =
    status === "ready" &&
    (tab === "following" ? followed.length === 0 : posts.length === 0);

  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <section className="border-t border-tint/10 bg-background/72">
        <Container className="min-w-0 pb-10 pt-4 sm:pb-12 sm:pt-5 lg:pb-16">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {language === "ko" ? "라이브러리" : "Library"}
            </p>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {heading}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {TABS.map((value) => (
              <button
                key={value}
                aria-pressed={tab === value}
                className={
                  tab === value
                    ? "rounded-full border border-accent/60 bg-accent/20 px-4 py-1.5 text-xs font-bold text-accent-ink"
                    : "rounded-full border border-tint/10 bg-tint/[0.03] px-4 py-1.5 text-xs font-bold text-muted hover:border-accent/50 hover:text-ink"
                }
                onClick={() => setTab(value)}
                type="button"
              >
                {labelFor(value, language)}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            {status === "loading" ? (
              <Card className="p-6">
                <p className="text-sm text-muted">
                  {language === "ko" ? "불러오는 중…" : "Loading…"}
                </p>
              </Card>
            ) : null}

            {status === "signed-out" ? (
              <Card className="p-6">
                <p className="text-lg font-semibold text-ink">
                  {language === "ko" ? "로그인이 필요해요" : "Sign in required"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {language === "ko"
                    ? "라이브러리를 보려면 로그인해 주세요."
                    : "Sign in to use the Library."}
                </p>
              </Card>
            ) : null}

            {showEmpty ? <EmptyCard tab={tab} language={language} /> : null}

            {status === "ready" && tab === "following" && followed.length > 0
              ? followed.map((profile) => (
                  <FollowedRow key={profile.id} profile={profile} language={language} />
                ))
              : null}

            {status === "ready" && tab !== "following" && posts.length > 0
              ? posts.map((post) => (
                  <LibraryPostRow key={post.id} post={post} language={language} />
                ))
              : null}
          </div>
        </Container>
      </section>
    </main>
  );
}

async function fetchPostIdsForTab(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  tab: LibraryTab,
  userId: string,
): Promise<string[]> {
  // Engagement on community posts is written by /api/posts/[id]/action, which
  // stores rows in cb_brief_* tables keyed by brief_id = community post id.
  // The Library reads from the same tables so the user sees what they did.
  if (tab === "saved" || tab === "liked") {
    const table = tab === "liked" ? "cb_brief_likes" : "cb_brief_saves";
    const { data } = await client
      .from(table)
      .select("brief_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const row of (data ?? []) as Array<{ brief_id: string }>) {
      if (row.brief_id && !seen.has(row.brief_id)) {
        seen.add(row.brief_id);
        ids.push(row.brief_id);
      }
    }
    return ids;
  }

  if (tab === "rebriefed") {
    // Posts the current user reposted via the engagement bar
    // (/api/posts/[id]/action with action: 'repost' writes here).
    const { data } = await client
      .from("cb_post_reposts")
      .select("post_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const row of (data ?? []) as Array<{ post_id: string }>) {
      if (row.post_id && !seen.has(row.post_id)) {
        seen.add(row.post_id);
        ids.push(row.post_id);
      }
    }
    return ids;
  }

  if (tab === "comments") {
    const { data } = await client
      .from("cb_brief_comments")
      .select("brief_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(400);
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const row of (data ?? []) as Array<{ brief_id: string }>) {
      if (row.brief_id && !seen.has(row.brief_id)) {
        seen.add(row.brief_id);
        ids.push(row.brief_id);
      }
    }
    return ids;
  }

  if (tab === "reading") {
    const { data } = await client
      .from("cb_brief_views")
      .select("brief_id, viewed_at")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(400);
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const row of (data ?? []) as Array<{ brief_id: string }>) {
      if (row.brief_id && !seen.has(row.brief_id)) {
        seen.add(row.brief_id);
        ids.push(row.brief_id);
      }
    }
    return ids;
  }

  return [];
}

function labelFor(tab: LibraryTab, language: "ko" | "en") {
  const ko: Record<LibraryTab, string> = {
    saved: "저장한 글",
    liked: "좋아요한 글",
    rebriefed: "리브리프한 글",
    comments: "댓글 기록",
    reading: "읽은 기록",
    following: "팔로우한 분석가",
  };
  const en: Record<LibraryTab, string> = {
    saved: "Saved posts",
    liked: "Liked posts",
    rebriefed: "Rebriefed posts",
    comments: "Comment history",
    reading: "Reading history",
    following: "Followed analysts",
  };
  return (language === "ko" ? ko : en)[tab];
}

function EmptyCard({ tab, language }: { tab: LibraryTab; language: "ko" | "en" }) {
  const titles: Record<LibraryTab, { ko: string; en: string }> = {
    saved: { ko: "저장한 글이 없어요", en: "No saved posts yet" },
    liked: { ko: "좋아요한 글이 없어요", en: "No liked posts yet" },
    rebriefed: { ko: "리브리프한 글이 없어요", en: "No rebriefed posts yet" },
    comments: { ko: "남긴 댓글이 없어요", en: "No comments yet" },
    reading: { ko: "읽은 글 기록이 없어요", en: "No reading history yet" },
    following: { ko: "팔로우한 분석가가 없어요", en: "Not following anyone yet" },
  };
  const hints: Record<LibraryTab, { ko: string; en: string }> = {
    saved: {
      ko: "커뮤니티에서 글을 북마크해 보세요.",
      en: "Bookmark posts in the community to see them here.",
    },
    liked: {
      ko: "커뮤니티에서 글에 좋아요를 눌러 보세요.",
      en: "Like posts in the community to see them here.",
    },
    rebriefed: {
      ko: "마음에 드는 글을 리브리프하면 여기에서 다시 볼 수 있어요.",
      en: "Rebrief a post and it'll appear here.",
    },
    comments: {
      ko: "남긴 댓글이 있으면 해당 글이 여기에 모여요.",
      en: "Comment on a post and it'll show up here.",
    },
    reading: {
      ko: "최근에 읽은 글이 여기에 자동으로 정리돼요.",
      en: "Posts you read recently land here automatically.",
    },
    following: {
      ko: "프로필 옆의 + 팔로우 버튼으로 분석가를 팔로우해 보세요.",
      en: "Use the + Follow button next to an author to follow them.",
    },
  };
  const title = titles[tab][language];
  const hint = hints[tab][language];
  return (
    <Card className="p-6">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{hint}</p>
    </Card>
  );
}

function LibraryPostRow({ post, language }: { post: CommunityPost; language: "ko" | "en" }) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <Link className="block" href={`/community#post-${post.id}`}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-2">
          <span className="font-semibold text-ink">{post.author}</span>
          <span>{formatRelativeTime(post.publishedAt, language)}</span>
          {post.category ? <Badge tone="muted">{post.category}</Badge> : null}
          {post.stance ? <Badge tone="accent">{post.stance}</Badge> : null}
        </div>
        <h3 className="mt-2 break-words text-base font-semibold text-ink">{post.title}</h3>
        <p
          className="mt-1 break-words text-sm leading-6 text-muted"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {post.preview}
        </p>
      </Link>
    </Card>
  );
}

function FollowedRow({
  profile,
  language,
}: {
  profile: FollowedProfile;
  language: "ko" | "en";
}) {
  const name = profile.username?.trim() || "Chain Brief member";
  const roleLabel = formatRole(profile.role, language);
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-tint/10 bg-tint/[0.04] text-sm font-bold text-ink">
          {profile.avatar_url && /^(https?:\/\/|\/)/i.test(profile.avatar_url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={name} className="h-full w-full object-cover" src={profile.avatar_url} />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{name}</p>
            {roleLabel ? <Badge tone="accent">{roleLabel}</Badge> : null}
          </div>
        </div>
        <FollowButton language={language} targetId={profile.id} />
      </div>
    </Card>
  );
}

function formatRole(role: string | null | undefined, language: "ko" | "en") {
  if (!role || role === "user") return null;
  const map: Record<string, { ko: string; en: string }> = {
    rookie_analyst: { ko: "루키 분석가", en: "Rookie Analyst" },
    rising_analyst: { ko: "라이징 분석가", en: "Rising Analyst" },
    verified_analyst: { ko: "Verified Analyst", en: "Verified Analyst" },
    partner_expert: { ko: "Partner Expert", en: "Partner Expert" },
    admin: { ko: "관리자", en: "Admin" },
  };
  return map[role]?.[language] ?? role;
}
