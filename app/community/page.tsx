"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import "./community.css";
import {
  addCommunityPostReply,
  addThreadQuote,
  COMMUNITY_POSTS_CHANGED_EVENT,
  COMMUNITY_QUOTE_CHANGED_EVENT,
  communityPostFromDatabase,
  mergeCommunityPosts,
  readCommunityPosts,
  readCommunityQuoteTarget,
  toggleCommunityPostLike,
  type CommunityEngagementMetrics,
  type CommunityPost,
  type DatabaseCommunityPostRow,
  type CommunityQuoteTarget,
  type CommunityStance,
  type QuotedCommunityPostSnapshot,
} from "@/lib/community";
import { cn } from "@/lib/cn";
import { formatLocalDateTime, formatRelativeTime, getCategoryLabel } from "@/lib/i18n";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type CommunityTab =
  | "Latest"
  | "News Reactions"
  | "Lounge"
  | "Chart Analysis"
  | "Trade Review"
  | "Loss Review"
  | "Rookie Analyst"
  | "Verified Analyst";
type SidebarAction = "guide" | "btc" | "news" | "analysis" | "macro" | "privacy" | "rules";

const TABS: CommunityTab[] = [
  "Latest",
  "News Reactions",
  "Lounge",
  "Chart Analysis",
  "Trade Review",
  "Loss Review",
  "Rookie Analyst",
  "Verified Analyst",
];

const INVESTMENT_NOTICE =
  "본 콘텐츠는 투자 권유가 아닌 정보 제공 목적입니다. 가상자산 투자는 원금 손실 위험이 있으며, 최종 판단과 책임은 투자자 본인에게 있습니다.";

const ANALYST_PATH = [
  {
    title: "General User",
    label: "일반 유저",
    description: "커뮤니티에 참여하고 뉴스에 의견을 남기는 단계",
  },
  {
    title: "Rookie Analyst",
    label: "Rookie Analyst",
    description: "분석글과 매매 복기를 작성하기 시작한 단계",
  },
  {
    title: "Rising Analyst",
    label: "Rising Analyst",
    description: "좋은 반응과 꾸준한 활동으로 주목받는 분석가 후보",
  },
  {
    title: "Verified Analyst",
    label: "Verified Analyst",
    description: "Chain Brief가 인증한 신뢰 기반 분석가",
  },
  {
    title: "Partner Expert",
    label: "Partner Expert",
    description: "프리미엄 리서치와 수익화가 가능한 파트너 전문가",
  },
];

const STANCES: CommunityStance[] = ["Bullish", "Bearish", "Neutral", "Question"];

const EXPLORE_ITEMS: Array<{
  action: SidebarAction;
  en: string;
  ko: string;
}> = [
  { action: "guide", en: "Chain Brief Guide", ko: "Chain Brief 가이드" },
  { action: "btc", en: "BTC Market Thoughts", ko: "BTC 시장 의견" },
  { action: "news", en: "Real-Time News Reactions", ko: "실시간 뉴스 반응" },
  { action: "analysis", en: "Bitcoin Analysis", ko: "비트코인 분석" },
  { action: "macro", en: "Macro Alerts", ko: "매크로 알림" },
  { action: "privacy", en: "Privacy & Safety", ko: "개인정보 및 안전" },
  { action: "rules", en: "Community Rules", ko: "커뮤니티 규칙" },
];

export default function CommunityPage() {
  const [preferences] = usePreferences();
  const { t: copy, language } = useI18n(preferences.language);
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const [authorName, setAuthorName] = useState("You");
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setAuthUser(user ?? null);
      if (!user) return;
      const profile = user.user_metadata?.chainBriefProfile as { displayName?: string } | undefined;
      const name =
        profile?.displayName ??
        (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null) ??
        (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
        user.email ??
        "You";
      setAuthorName(name);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const [localPosts, setLocalPosts] = useState<CommunityPost[]>([]);
  const [remotePosts, setRemotePosts] = useState<CommunityPost[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<Record<string, CommunityEngagementMetrics>>({});
  const [quoteTarget, setQuoteTarget] = useState<CommunityQuoteTarget | null>(null);
  const [activeTab, setActiveTab] = useState<CommunityTab>("Latest");
  const [selectedArticleSlug] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return new URLSearchParams(window.location.search).get("articleSlug")?.trim() || null;
  });

  const posts = useMemo(
    () => mergeCommunityPosts(remotePosts, localPosts),
    [localPosts, remotePosts],
  );

  useEffect(() => {
    function syncCommunityState() {
      setLocalPosts(readCommunityPosts());
      setQuoteTarget(readCommunityQuoteTarget());
    }

    syncCommunityState();
    window.addEventListener("storage", syncCommunityState);
    window.addEventListener(COMMUNITY_POSTS_CHANGED_EVENT, syncCommunityState);
    window.addEventListener(COMMUNITY_QUOTE_CHANGED_EVENT, syncCommunityState);

    return () => {
      window.removeEventListener("storage", syncCommunityState);
      window.removeEventListener(COMMUNITY_POSTS_CHANGED_EVENT, syncCommunityState);
      window.removeEventListener(COMMUNITY_QUOTE_CHANGED_EVENT, syncCommunityState);
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isMounted = true;

    async function loadPublicPosts() {
      const { data, error } = await client
        .from("posts")
        .select(
          "id, author_id, title, body, category, post_type, coin_tags, linked_news_id, status, view_count, created_at, updated_at, profiles(username, avatar_url, role)",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!isMounted) return;

      if (error) {
        console.warn("Failed to load public community posts", error);
        setRemotePosts([]);
        return;
      }

      setRemotePosts(
        ((data ?? []) as DatabaseCommunityPostRow[]).map(communityPostFromDatabase),
      );
    }

    void loadPublicPosts();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const focusedTarget = useMemo(() => {
    if (!selectedArticleSlug) {
      return null;
    }

    if (quoteTarget?.slug === selectedArticleSlug) {
      return quoteTarget;
    }

    const matchingPost = posts.find((post) => post.relatedArticleSlug === selectedArticleSlug);
    return matchingPost ? postToQuoteTarget(matchingPost) : null;
  }, [posts, quoteTarget, selectedArticleSlug]);

  const visiblePosts = useMemo(() => {
    const filtered = focusedTarget
      ? posts.filter((post) => post.relatedArticleSlug === selectedArticleSlug)
      : filterPostsByTab(posts, activeTab);

    return sortPostsForTab(filtered, activeTab);
  }, [activeTab, focusedTarget, posts, selectedArticleSlug]);
  const analystTabActive = !focusedTarget && isAnalystTab(activeTab);

  const popularPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => engagementScore(b) - engagementScore(a))
      .slice(0, 5);
  }, [posts]);

  const visiblePostIds = useMemo(
    () => visiblePosts.filter((post) => isDatabasePostId(post.id)).map((post) => post.id),
    [visiblePosts],
  );

  useEffect(() => {
    if (!visiblePostIds.length) {
      return;
    }

    let active = true;
    async function loadEngagement() {
      const response = await fetch(`/api/community/engagement?postIds=${encodeURIComponent(visiblePostIds.join(","))}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { metrics?: Record<string, CommunityEngagementMetrics> };
      if (active) setEngagementMetrics(data.metrics ?? {});
    }

    void loadEngagement();
    const sessionId = getCommunitySessionId();
    for (const postId of visiblePostIds) {
      void fetch("/api/community/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view", postId, sessionId }),
      });
    }

    return () => {
      active = false;
    };
  }, [visiblePostIds]);

  async function refreshEngagement(postId: string) {
    if (!isDatabasePostId(postId)) return;
    const response = await fetch(`/api/community/engagement?postIds=${encodeURIComponent(postId)}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { metrics?: Record<string, CommunityEngagementMetrics> };
    const next = data.metrics?.[postId];
    if (next) setEngagementMetrics((current) => ({ ...current, [postId]: next }));
  }

  async function handleEngagementAction(
    post: CommunityPost,
    action: "like" | "save" | "reaction" | "comment" | "rebrief" | "quote_analysis",
    input?: { body?: string; value?: "bull" | "bear" },
  ) {
    if (!isDatabasePostId(post.id)) {
      if (action === "like") toggleCommunityPostLike(post.id);
      if (action === "comment" && input?.body) addCommunityPostReply(post.id, input.body, authorName);
      if (action === "rebrief" && input?.body) addThreadQuote(input.body, post, { author: authorName });
      if (action === "quote_analysis" && input?.body) addThreadQuote(input.body, post, { author: authorName });
      return;
    }

    const response = await fetch("/api/community/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, postId: post.id, ...input }),
    });

    if (response.ok) {
      await refreshEngagement(post.id);
    }
  }

  function handleSidebarAction(action: SidebarAction) {
    switch (action) {
      case "guide":
        scrollToSection("community-banner");
        break;
      case "btc":
        setActiveTab("Lounge");
        scrollToSection("community-feed");
        break;
      case "news":
        setActiveTab("News Reactions");
        scrollToSection("community-feed");
        break;
      case "analysis":
        setActiveTab("Chart Analysis");
        scrollToSection("community-feed");
        break;
      case "macro":
        setActiveTab("News Reactions");
        scrollToSection("community-feed");
        break;
      case "privacy":
      case "rules":
        scrollToSection("community-guidelines");
        break;
    }
  }

  return (
    <>
      <div className="cb-community cb-community-desktop-only">
        <Header />
        <div className="cb-wrap">
          <CommunityLeftNav language={language} onAction={handleSidebarAction} />

          <main className="cb-main">
            <CommunityHeader language={language} />
            <CommunityTabs activeTab={activeTab} language={language} onChange={setActiveTab} />
            <CommunityToolbar canWrite={Boolean(authUser)} language={language} />

            {focusedTarget ? (
              <div style={{ padding: "16px 24px" }}>
                <RelatedNewsCard copy={copy} language={language} target={focusedTarget} />
              </div>
            ) : null}

            <div id="community-feed">
              {visiblePosts.length === 0 ? (
                <div
                  style={{
                    padding: "48px 24px",
                    fontSize: 13,
                    color: "var(--cb-t3)",
                    textAlign: "center",
                  }}
                >
                  {selectedArticleSlug
                    ? language === "ko"
                      ? "이 뉴스에 대한 토론이 아직 없습니다. 첫 의견을 남겨보세요."
                      : "No discussion yet for this news item. Share the first take."
                    : language === "ko"
                      ? "아직 커뮤니티 글이 없습니다. 첫 의견을 남겨보세요."
                      : "No community posts yet. Share the first take."}
                </div>
              ) : analystTabActive ? (
                <div style={{ padding: "16px 24px" }}>
                  <AnalystWorkList
                    copy={copy}
                    language={language}
                    posts={visiblePosts}
                    tier={activeTab}
                  />
                </div>
              ) : (
                visiblePosts.map((post) => (
                  <div
                    key={post.id}
                    style={{ padding: "12px 24px", borderBottom: "1px solid var(--cb-b1)" }}
                  >
                    <CommunityPostCard
                      authorName={authorName}
                      copy={copy}
                      language={language}
                      metrics={engagementMetrics[post.id]}
                      onEngagementAction={handleEngagementAction}
                      post={post}
                    />
                  </div>
                ))
              )}
            </div>
          </main>

          <aside className="cb-rightnav">
            <TrendingWidget posts={popularPosts} language={language} />
          </aside>
        </div>
      </div>

      <MobileFallback language={language} />
    </>
  );
}

function CommunityHeader({ language }: { language: "ko" | "en" }) {
  return (
    <div
      style={{
        padding: "20px 24px 0",
        borderBottom: "1px solid var(--cb-b1)",
      }}
    >
      <div
        style={{
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginBottom: 3,
          color: "var(--cb-t1)",
        }}
      >
        {language === "ko" ? "커뮤니티" : "Community"}
      </div>
      <div style={{ fontSize: 12, color: "var(--cb-t3)", marginBottom: 14 }}>
        {language === "ko"
          ? "시장 의견, 뉴스 반응, 그리고 크립토 리서치 아이디어를 빠르게 나누세요."
          : "Share market thoughts, news reactions, and crypto research ideas."}
      </div>
    </div>
  );
}

function CommunityLeftNav({
  language,
  onAction,
}: {
  language: "ko" | "en";
  onAction: (action: SidebarAction) => void;
}) {
  return (
    <aside className="cb-leftnav">
      <CbSectionLabel>{language === "ko" ? "둘러보기" : "Explore"}</CbSectionLabel>
      <CbMenuLink href="/" label={language === "ko" ? "홈" : "Home"} icon={<HomeIcon />} />
      <CbMenuLink href="/briefs" label={language === "ko" ? "브리프" : "Briefs"} icon={<BoltIcon />} />
      <CbMenuLink href="/market" label={language === "ko" ? "마켓" : "Market"} icon={<PulseIcon />} />
      <CbMenuLink href="/analyst" label="Analyst" icon={<AwardIcon />} />
      <CbMenuLink href="/sns" label="SNS" icon={<ChatIcon />} />

      <CbDivider />
      <CbSectionLabel>{language === "ko" ? "커뮤니티" : "Community"}</CbSectionLabel>
      <CbMenuLink
        href="/community"
        label={language === "ko" ? "커뮤니티" : "Community"}
        icon={<UsersIcon />}
        active
      />
      {EXPLORE_ITEMS.map((item) => (
        <button
          key={item.action}
          type="button"
          onClick={() => onAction(item.action)}
          className="flex items-center gap-2"
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 13,
            color: "var(--cb-t2)",
            background: "transparent",
            border: "none",
            textAlign: "left",
          }}
        >
          {language === "ko" ? item.ko : item.en}
        </button>
      ))}
    </aside>
  );
}

function CbSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "var(--cb-t3)",
        padding: "8px 10px 4px",
        marginTop: 4,
      }}
    >
      {children}
    </span>
  );
}

function CbMenuLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2"
      style={{
        padding: "8px 10px",
        borderRadius: 6,
        fontSize: 13,
        color: active ? "var(--cb-accent)" : "var(--cb-t2)",
        background: active ? "rgba(47,123,255,0.12)" : "transparent",
        transition: "all .1s",
      }}
    >
      {icon ? <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>{icon}</span> : null}
      <span>{label}</span>
    </Link>
  );
}

function CbDivider() {
  return <div style={{ height: 1, background: "var(--cb-b1)", margin: "8px 4px" }} />;
}

function CommunityToolbar({
  canWrite,
  language,
}: {
  canWrite: boolean;
  language: "ko" | "en";
}) {
  // Always link to the writing form — it handles its own login prompt.
  void canWrite;
  const writeHref = "/community/write";
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "10px 24px",
        borderBottom: "1px solid var(--cb-b1)",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--cb-t3)" }}>
        {language === "ko" ? "최신순" : "Latest first"}
      </div>
      <Link
        href={writeHref}
        className="flex items-center gap-1.5"
        style={{
          padding: "6px 13px",
          background: "var(--cb-accent)",
          color: "#fff",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {language === "ko" ? "글쓰기" : "Write"}
      </Link>
    </div>
  );
}

function MobileFallback({ language }: { language: "ko" | "en" }) {
  return (
    <div
      className="cb-community-mobile-only"
      style={{
        display: "none",
        minHeight: "100vh",
        background: "rgb(var(--color-background))",
        color: "rgb(var(--color-ink))",
        padding: "32px 24px",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 600 }}>
        {language === "ko" ? "커뮤니티" : "Community"}
      </div>
      <div style={{ fontSize: 13, color: "rgb(var(--color-muted))", lineHeight: 1.6 }}>
        {language === "ko"
          ? "커뮤니티 페이지는 데스크탑(1024px 이상)에 최적화되어 있습니다. 넓은 화면에서 다시 열어주세요."
          : "The community page is optimized for desktop (1024px+). Please open on a wider screen."}
      </div>
      <Link
        href="/"
        style={{
          marginTop: 8,
          alignSelf: "flex-start",
          padding: "8px 14px",
          background: "#2F7BFF",
          color: "#fff",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {language === "ko" ? "홈으로" : "Home"}
      </Link>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function PulseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function AwardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CommunityBanner({ language }: { language: "ko" | "en" }) {
  return (
    <Card id="community-banner" className="min-w-0 overflow-hidden border-accent/20 bg-accent-soft/40 p-0">
      <div className="flex min-w-0 flex-col gap-4 border-l-4 border-accent p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{language === "ko" ? "커뮤니티" : "Community"}</Badge>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-2">
            Chain Brief
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-ink">
            {language === "ko"
              ? "Chain Brief 커뮤니티에 참여하세요"
              : "Join the Chain Brief community"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {language === "ko"
              ? "시장 의견을 나누고 크립토 내러티브를 빠르게 따라가세요."
              : "Share your market view and follow crypto narratives."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/community/write" variant="primary">
            {language === "ko" ? "글쓰기" : "Write post"}
          </Button>
          <Button href="#community-feed" variant="secondary">
            {language === "ko" ? "피드 보기" : "View feed"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function WriteStudioCallout({
  language,
  focusedTarget,
  onClearTarget,
}: {
  language: "ko" | "en";
  focusedTarget?: CommunityQuoteTarget | null;
  onClearTarget?: () => void;
}) {
  const writeHref = focusedTarget
    ? `/community/write?articleSlug=${encodeURIComponent(focusedTarget.slug)}`
    : "/community/write";

  return (
    <Card className="min-w-0 border-accent/20 bg-tint/[0.03] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {language === "ko" ? "Writing Studio" : "Writing Studio"}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-ink">
            {language === "ko"
              ? "글쓰기는 별도 페이지에서 집중해서 작성하세요."
              : "Write in a dedicated studio page."}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {language === "ko"
              ? "이미지와 영상 첨부, 템플릿, 분석 방향 선택을 한 곳에 모았습니다."
              : "Templates, attachments, and post direction live on a separate page."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onClearTarget && focusedTarget ? (
            <Button variant="secondary" onClick={onClearTarget} type="button">
              {language === "ko" ? "연결 해제" : "Clear target"}
            </Button>
          ) : null}
          <Button href={writeHref}>{language === "ko" ? "쓰기 열기" : "Open writer"}</Button>
        </div>
      </div>
    </Card>
  );
}

function CommunityTabs({
  activeTab,
  language,
  onChange,
}: {
  activeTab: CommunityTab;
  language: "ko" | "en";
  onChange: (tab: CommunityTab) => void;
}) {
  const tabLabels: Record<CommunityTab, string> = {
    Latest: language === "ko" ? "전체" : "All",
    "News Reactions": language === "ko" ? "뉴스토론" : "News",
    Lounge: language === "ko" ? "라운지" : "Lounge",
    "Chart Analysis": language === "ko" ? "차트분석" : "Chart",
    "Trade Review": language === "ko" ? "매매복기" : "Trade Review",
    "Loss Review": language === "ko" ? "손실복기" : "Loss Review",
    "Rookie Analyst": "Rookie Analyst",
    "Verified Analyst": "Verified Analyst",
  };

  const tabGlyphs: Record<CommunityTab, string> = {
    Latest: "All",
    "News Reactions": "N",
    Lounge: "L",
    "Chart Analysis": "C",
    "Trade Review": "T",
    "Loss Review": "R",
    "Rookie Analyst": "RA",
    "Verified Analyst": "VA",
  };

  void tabGlyphs;
  return (
    <div
      className="flex"
      style={{
        padding: "0 24px",
        borderBottom: "1px solid var(--cb-b1)",
        overflowX: "auto",
      }}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab)}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              color: active ? "var(--cb-t1)" : "var(--cb-t2)",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${active ? "var(--cb-accent)" : "transparent"}`,
              marginBottom: -1,
              fontWeight: active ? 500 : 400,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {tabLabels[tab]}
          </button>
        );
      })}
    </div>
  );
}

function AnalystPathSection() {
  return (
    <section className="grid gap-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Analyst Path
          </p>
          <h2 className="mt-2 text-xl font-semibold text-ink">
            Build trust through analysis, not calls.
          </h2>
        </div>
        <Button className="w-full sm:w-auto" href="/profile#verified-analyst" variant="secondary">
          Verified Analyst 신청하기
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ANALYST_PATH.map((step, index) => (
          <Card className="min-w-0 p-4" key={step.title}>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-md border border-accent/30 bg-accent/15 px-2 py-1 text-xs font-bold text-accent-ink">
                {index + 1}
              </span>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-2">
                {step.title}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-ink">{step.label}</h3>
            <p className="mt-2 text-xs leading-5 text-muted">{step.description}</p>
          </Card>
        ))}
      </div>
      <RiskNotice />
    </section>
  );
}

function AnalystScoreCard({ compact = false }: { compact?: boolean }) {
  const scores = [
    ["근거 충실도", 72],
    ["리스크 설명", 68],
    ["독자 반응", 81],
    ["꾸준함", 64],
    ["신뢰도", 76],
  ] as const;

  return (
    <div className={compact ? "grid gap-2" : "grid gap-3"}>
      {scores.map(([label, value]) => (
        <div key={label}>
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-muted">{label}</span>
            <span className="font-semibold text-accent-ink">{value}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-tint/10">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskNotice() {
  return (
    <div className="rounded-lg border border-tint/10 bg-tint/[0.03] px-3 py-2.5">
      <p className="border-l-2 border-amber-400/50 pl-3 text-xs leading-5 text-muted-2">
        {INVESTMENT_NOTICE}
      </p>
    </div>
  );
}

function AnalystWorkList({
  posts,
  tier,
  language,
  copy,
}: {
  posts: CommunityPost[];
  tier: Extract<CommunityTab, "Rookie Analyst" | "Verified Analyst">;
  language: "ko" | "en";
  copy: ReturnType<typeof useI18n>["t"];
}) {
  const analystCount = new Set(posts.map((post) => post.author)).size;
  const totalEngagement = posts.reduce((sum, post) => sum + Math.round(engagementScore(post)), 0);
  const latestPost = posts.reduce<CommunityPost | null>((latest, post) => {
    if (!latest) return post;
    return new Date(post.publishedAt).getTime() > new Date(latest.publishedAt).getTime()
      ? post
      : latest;
  }, null);

  return (
    <section className="grid min-w-0 gap-3">
      <Card className="min-w-0 overflow-hidden border-accent/20 bg-accent-soft/40 p-0">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{tier}</Badge>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-2">
                Analyst Work
              </span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-ink">
              {tier === "Rookie Analyst" ? "Rookie analyst work" : "Verified analyst work"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {language === "ko"
                ? "Analyst posts are grouped here so readers can scan research, reviews, and market reasoning quickly."
                : "A focused list of analyst posts, reviews, and research so readers can compare the work fast."}
            </p>
          </div>
          <Button className="w-full sm:w-auto" href="/community/write" variant="secondary">
            Write analyst post
          </Button>
        </div>
        <div className="grid border-t border-tint/10 sm:grid-cols-3">
          <AnalystWorkStat label="Works" value={posts.length.toString()} />
          <AnalystWorkStat label="Analysts" value={analystCount.toString()} />
          <AnalystWorkStat
            label="Latest"
            value={latestPost ? formatRelativeTime(latestPost.publishedAt, language) : "-"}
          />
        </div>
      </Card>

      <div className="grid min-w-0 gap-3">
        {posts.map((post, index) => (
          <AnalystWorkItem
            copy={copy}
            index={index}
            key={post.id}
            language={language}
            post={post}
            totalEngagement={totalEngagement}
          />
        ))}
      </div>
    </section>
  );
}

function AnalystWorkStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-tint/10 px-4 py-3 sm:border-l sm:first:border-l-0">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function AnalystWorkItem({
  post,
  index,
  language,
  copy,
  totalEngagement,
}: {
  post: CommunityPost;
  index: number;
  language: "ko" | "en";
  copy: ReturnType<typeof useI18n>["t"];
  totalEngagement: number;
}) {
  const score = Math.round(engagementScore(post));
  const share = totalEngagement > 0 ? Math.max(8, Math.round((score / totalEngagement) * 100)) : 8;

  return (
    <Card className="min-w-0 p-0">
      <article className="grid min-w-0 gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_12rem] md:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/15 text-xs font-bold text-accent-ink">
              {index + 1}
            </span>
            <span className="min-w-0 truncate text-sm font-semibold text-ink">{post.author}</span>
            {post.analystTier ? <Badge tone="accent">{formatAnalystTier(post.analystTier)}</Badge> : null}
            {post.postType ? <Badge tone="muted">{formatPostType(post.postType)}</Badge> : null}
            <Badge tone={getBadgeTone(post.stance)}>{stanceLabel(post.stance, copy, language)}</Badge>
          </div>
          <h3 className="mt-3 break-words text-lg font-semibold leading-7 text-ink">{post.title}</h3>
          <p className="mt-2 break-words text-sm leading-6 text-muted">{post.preview}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-2">
            <span>{formatRelativeTime(post.publishedAt, language)}</span>
            <span>{post.likes} likes</span>
            <span>{post.commentsCount} {copy.community.comments}</span>
            <span>{post.views} {copy.community.views}</span>
            {post.relatedArticleSource ? <Badge tone="muted">{post.relatedArticleSource}</Badge> : null}
          </div>
        </div>

        <aside className="min-w-0 rounded-md border border-tint/10 bg-tint/[0.03] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
              Work score
            </span>
            <span className="text-sm font-semibold text-accent-ink">{score}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-tint/10">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            {post.topic || getCategoryLabel(post.category, language)}
          </p>
        </aside>
      </article>
    </Card>
  );
}

function RelatedNewsCard({
  target,
  language,
  copy,
}: {
  target: CommunityQuoteTarget;
  language: "ko" | "en";
  copy: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {copy.community.relatedNews}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="accent">{target.sourceName}</Badge>
        <Badge tone="muted">{getCategoryLabel(target.category, language)}</Badge>
        <span className="text-xs font-medium text-muted-2">
          {formatLocalDateTime(target.publishedAt, language)}
        </span>
      </div>
      <h2 className="mt-3 break-words text-xl font-semibold text-ink">{target.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{target.briefSummary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button href={target.originalUrl} rel="noreferrer" target="_blank">
          {copy.community.readOriginal}
        </Button>
      </div>
    </Card>
  );
}

function OpinionComposer({
  title,
  body,
  stance,
  language,
  focusedTarget,
  onTitleChange,
  onBodyChange,
  onStanceChange,
  onSubmit,
  onClearTarget,
  copy,
}: {
  title: string;
  body: string;
  stance: CommunityStance;
  language: "ko" | "en";
  focusedTarget: CommunityQuoteTarget | null;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onStanceChange: (stance: CommunityStance) => void;
  onSubmit: () => void;
  onClearTarget: () => void;
  copy: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 gap-3">
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-tint/10 bg-accent/15 text-sm font-bold text-accent-ink">
          CB
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">
              {copy.community.shareYourTake}
            </p>
            <span className="text-xs text-muted-2">{copy.community.loginRequired}</span>
          </div>

          {focusedTarget ? (
            <div className="mt-3 rounded-xl border border-accent/20 bg-accent/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
                  {copy.community.discussing}
                </p>
                <button
                  type="button"
                  onClick={onClearTarget}
                  className="text-xs font-semibold text-muted transition hover:text-ink"
                >
                  {language === "ko" ? "해제" : "Remove"}
                </button>
              </div>
              <p className="mt-2 break-words text-sm font-semibold text-ink">
                {focusedTarget.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="accent">{focusedTarget.sourceName}</Badge>
                <Badge tone="muted">{getCategoryLabel(focusedTarget.category, language)}</Badge>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <label className="block min-w-0">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {copy.community.opinionTitleLabel}
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder={copy.community.opinionTitlePlaceholder}
                value={title}
              />
            </label>

            <label className="block min-w-0">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {copy.community.opinionBodyLabel}
              </span>
              <textarea
                className="mt-2 min-h-32 w-full rounded-md border border-tint/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(event) => onBodyChange(event.target.value)}
                placeholder={
                  focusedTarget
                    ? copy.community.opinionBodyPlaceholder
                    : copy.community.opinionBodyPlaceholder
                }
                value={body}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {STANCES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={stance === item}
                onClick={() => onStanceChange(item)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                  stance === item
                    ? "border-accent/60 bg-accent/20 text-accent-ink"
                    : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/50 hover:text-ink",
                )}
              >
                {language === "ko"
                  ? item === "Bullish"
                    ? "상승"
                    : item === "Bearish"
                      ? "하락"
                      : item === "Neutral"
                        ? "중립"
                        : "질문"
                  : item}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="w-full sm:w-auto" onClick={onSubmit} type="button">
              {copy.community.postOpinion}
            </Button>
            <p className="text-sm leading-6 text-muted-2">{copy.community.loginRequired}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CommunityPostCard({
  post,
  language,
  copy,
  authorName,
  metrics,
  onEngagementAction,
}: {
  post: CommunityPost;
  language: "ko" | "en";
  copy: ReturnType<typeof useI18n>["t"];
  authorName: string;
  metrics?: CommunityEngagementMetrics;
  onEngagementAction: (
    post: CommunityPost,
    action: "like" | "save" | "reaction" | "comment" | "rebrief" | "quote_analysis",
    input?: { body?: string; value?: "bull" | "bear" },
  ) => Promise<void>;
}) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteBody, setQuoteBody] = useState("");
  const [quoteStance, setQuoteStance] = useState<CommunityStance>("Neutral");
  const [reposted, setReposted] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [rebriefOpen, setRebriefOpen] = useState(false);
  const [rebriefBody, setRebriefBody] = useState("");

  const isRepost = post.kind === "thread_repost";
  const isThreadQuote = post.kind === "thread_quote";
  const canThread = !isRepost;

  function handleRepost() {
    if (reposted) return;
    setRebriefOpen((open) => !open);
  }

  async function handleQuoteSubmit() {
    const trimmed = quoteBody.trim();
    if (!trimmed) return;
    await onEngagementAction(post, "quote_analysis", { body: trimmed });
    setQuoteOpen(false);
    setQuoteBody("");
    setQuoteStance("Neutral");
  }

  async function handleLike() {
    await onEngagementAction(post, "like");
  }

  async function handleReplySubmit() {
    if (!replyBody.trim()) return;
    await onEngagementAction(post, "comment", { body: replyBody });
    setReplyBody("");
    setReplyOpen(false);
  }

  async function handleSave() {
    await onEngagementAction(post, "save");
  }

  async function handleReaction(value: "bull" | "bear") {
    await onEngagementAction(post, "reaction", { value });
  }

  async function handleRebriefSubmit() {
    const trimmed = rebriefBody.trim();
    if (!trimmed) return;
    await onEngagementAction(post, "rebrief", { body: trimmed });
    setRebriefBody("");
    setRebriefOpen(false);
    setReposted(true);
  }

  const views = metrics?.views ?? post.views;
  const likes = metrics?.likes ?? post.likes;
  const comments = metrics?.comments ?? post.commentsCount;
  const saves = metrics?.saves ?? 0;
  const bull = metrics?.bull ?? 0;
  const bear = metrics?.bear ?? 0;
  const sentimentTotal = bull + bear;
  const bullShare = sentimentTotal ? Math.round((bull / sentimentTotal) * 100) : 0;
  const rebriefCount = (metrics?.rebriefs ?? 0) + (metrics?.quoteAnalyses ?? 0);

  return (
    <Card className="min-w-0 p-4 sm:p-5">
      {isRepost ? (
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-2">
          <span>↺</span>
          <span>{language === "ko" ? "회원님이 리포스트했습니다" : "You reposted"}</span>
        </p>
      ) : null}

      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tint/10 bg-tint/[0.04] text-sm font-bold text-ink">
          {isRepost && post.quotedCommunityPost
            ? avatarFromName(post.quotedCommunityPost.author)
            : (post.avatar ?? avatarFromName(post.author))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-ink">
              {isRepost && post.quotedCommunityPost ? post.quotedCommunityPost.author : post.author}
            </p>
            <span className="text-xs text-muted-2">
              {formatRelativeTime(post.publishedAt, language)}
            </span>
            <Badge tone="muted">{getCategoryLabel(post.category, language)}</Badge>
            <Badge tone={getBadgeTone(post.stance)}>{stanceLabel(post.stance, copy, language)}</Badge>
            {post.analystTier ? (
              <Badge tone="accent">{formatAnalystTier(post.analystTier)}</Badge>
            ) : null}
            {post.postType ? <Badge tone="muted">{formatPostType(post.postType)}</Badge> : null}
          </div>

          <h3 className="mt-3 break-words text-lg font-semibold text-ink">
            {isRepost && post.quotedCommunityPost ? post.quotedCommunityPost.title : post.title}
          </h3>
          <p
            className="mt-2 break-words text-sm leading-6 text-muted"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {isRepost && post.quotedCommunityPost ? post.quotedCommunityPost.preview : post.preview}
          </p>

          {post.relatedArticleTitle ? (
            <div className="mt-4 rounded-xl border border-tint/10 bg-tint/[0.03] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
                {copy.community.discussing}: {post.relatedArticleTitle}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {post.relatedArticleSource ? (
                  <Badge tone="accent">{post.relatedArticleSource}</Badge>
                ) : null}
                {post.relatedArticleUrl ? (
                  <Button
                    href={post.relatedArticleUrl}
                    rel="noreferrer"
                    target="_blank"
                    variant="secondary"
                  >
                    {copy.community.readOriginal}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {post.attachments?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {post.attachments.map((attachment) => (
                <figure
                  key={attachment.id}
                  className="overflow-hidden rounded-xl border border-tint/10 bg-tint/[0.03]"
                >
                  {attachment.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={attachment.name}
                      className="aspect-video w-full object-cover"
                      src={attachment.dataUrl}
                    />
                  ) : (
                    <video className="aspect-video w-full bg-black object-cover" controls src={attachment.dataUrl} />
                  )}
                  <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted-2">
                    <span className="truncate">{attachment.name}</span>
                    <span>{attachment.kind === "image" ? "Image" : "Video"}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}

          {(isThreadQuote || (!isRepost && post.quotedCommunityPost)) ? (
            <QuotedPostEmbed language={language} snapshot={post.quotedCommunityPost!} />
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-2">
            <span>{post.likes} {language === "ko" ? "좋아요" : "likes"}</span>
            <span>{post.commentsCount} {copy.community.comments}</span>
            <span>{post.views} {copy.community.views}</span>
            {post.tags[0] ? <Badge tone="muted">{post.tags[0]}</Badge> : null}
          </div>

          <div className="mt-3 grid gap-2 rounded-xl border border-tint/10 bg-tint/[0.025] p-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-2">
              <span>{formatViewCount(views)} views</span>
              <span>{likes} likes</span>
              <span>{comments} comments</span>
              <span>{saves} saves</span>
              <span>{sentimentTotal ? `${bullShare}% Bull` : "No Bull/Bear votes"}</span>
              <span>{rebriefCount} rebriefs/quotes</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-rose-400/25">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${bullShare}%` }} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-tint/10 py-3">
            <button
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition",
                metrics?.likedByUser || post.likedByUser
                  ? "border-accent/50 bg-accent/15 text-accent-ink"
                  : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/40 hover:text-ink",
              )}
              onClick={handleLike}
              type="button"
            >
              <span>{metrics?.likedByUser || post.likedByUser ? "Liked" : "Like"}</span>
              <span className="text-muted-2">{likes}</span>
            </button>
            <button
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition",
                replyOpen
                  ? "border-accent/50 bg-accent/15 text-accent-ink"
                  : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/40 hover:text-ink",
              )}
              onClick={() => setReplyOpen((open) => !open)}
              type="button"
            >
              <span>Reply</span>
              <span className="text-muted-2">{comments}</span>
            </button>
            <button
              className="inline-flex h-9 items-center rounded-full border border-tint/10 bg-tint/[0.03] px-3 text-xs font-bold text-muted transition hover:border-accent/40 hover:text-ink"
              onClick={handleSave}
              type="button"
            >
              {metrics?.savedByUser ? "Saved" : "Save"} {saves}
            </button>
            <button
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3 text-xs font-bold transition",
                metrics?.userReaction === "bull"
                  ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                  : "border-tint/10 bg-tint/[0.03] text-muted hover:border-emerald-400/40 hover:text-ink",
              )}
              onClick={() => handleReaction("bull")}
              type="button"
            >
              Bull {bull}
            </button>
            <button
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3 text-xs font-bold transition",
                metrics?.userReaction === "bear"
                  ? "border-rose-400/50 bg-rose-400/15 text-rose-300"
                  : "border-tint/10 bg-tint/[0.03] text-muted hover:border-rose-400/40 hover:text-ink",
              )}
              onClick={() => handleReaction("bear")}
              type="button"
            >
              Bear {bear}
            </button>
            {canThread ? (
              <>
                <button
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3 text-xs font-bold transition",
                    reposted
                      ? "border-accent/50 bg-accent/15 text-accent-ink"
                      : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/40 hover:text-ink",
                  )}
                  onClick={handleRepost}
                  type="button"
                >
                  {reposted ? "Rebriefed" : "Rebrief"} {metrics?.rebriefs ?? 0}
                </button>
                <button
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3 text-xs font-bold transition",
                    quoteOpen
                      ? "border-accent/50 bg-accent/15 text-accent-ink"
                      : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/40 hover:text-ink",
                  )}
                  onClick={() => setQuoteOpen((open) => !open)}
                  type="button"
                >
                  Quote Analysis {metrics?.quoteAnalyses ?? 0}
                </button>
              </>
            ) : null}
            <Link
              className="inline-flex h-9 items-center rounded-full border border-tint/10 bg-tint/[0.03] px-3 text-xs font-bold text-muted transition hover:border-accent/40 hover:text-ink"
              href={`/community/${post.id}`}
            >
              Details
            </Link>
          </div>

          {rebriefOpen ? (
            <div className="mt-4 rounded-xl border border-accent/20 bg-accent/[0.06] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Rebrief with a short market take
              </p>
              <textarea
                autoFocus
                className="min-h-20 w-full rounded-md border border-tint/10 bg-background px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/25"
                maxLength={280}
                onChange={(event) => setRebriefBody(event.target.value)}
                placeholder="Add the catalyst, risk, or trade angle you want others to notice"
                value={rebriefBody}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="h-9 rounded-md border border-tint/10 px-3 text-xs font-bold text-muted transition hover:text-ink"
                  onClick={() => {
                    setRebriefOpen(false);
                    setRebriefBody("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-9 rounded-md border border-accent/40 bg-accent/15 px-3 text-xs font-bold text-accent-ink transition hover:bg-accent/20"
                  onClick={handleRebriefSubmit}
                  type="button"
                >
                  Rebrief
                </button>
              </div>
            </div>
          ) : null}

          {post.replies?.length ? (
            <div className="mt-4 space-y-3 border-l border-tint/10 pl-3">
              {post.replies.slice(-3).map((reply) => (
                <div key={reply.id} className="rounded-lg border border-tint/10 bg-tint/[0.03] p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-2">
                    <span className="font-semibold text-ink">{reply.author}</span>
                    <span>{formatRelativeTime(reply.createdAt, language)}</span>
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-muted">{reply.body}</p>
                </div>
              ))}
            </div>
          ) : null}

          {replyOpen ? (
            <div className="mt-4 rounded-xl border border-tint/10 bg-background/70 p-3">
              <textarea
                autoFocus
                className="min-h-20 w-full rounded-md border border-tint/10 bg-background px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/25"
                maxLength={240}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder="Reply with your market take"
                value={replyBody}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="h-9 rounded-md border border-tint/10 px-3 text-xs font-bold text-muted transition hover:text-ink"
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyBody("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-9 rounded-md border border-accent/40 bg-accent/15 px-3 text-xs font-bold text-accent-ink transition hover:bg-accent/20"
                  onClick={handleReplySubmit}
                  type="button"
                >
                  Reply
                </button>
              </div>
            </div>
          ) : null}

          {post.analystTier ? (
            <div className="mt-4 rounded-xl border border-tint/10 bg-tint/[0.03] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Analyst Score
                </p>
                <span className="text-xs font-semibold text-accent-ink">
                  {formatAnalystTier(post.analystTier)}
                </span>
              </div>
              <AnalystScoreCard compact />
            </div>
          ) : null}

          {isAnalysisPost(post) ? <div className="mt-4"><RiskNotice /></div> : null}

          <div className="hidden">
            <IconButton label={language === "ko" ? "북마크" : "Bookmark"} glyph="⌁" />
            <IconButton
              label={language === "ko" ? "공유" : "Share"}
              glyph="↗"
              onClick={() => sharePost(post)}
            />
            {canThread ? (
              <>
                <IconButton
                  active={reposted}
                  glyph="↺"
                  label={
                    reposted
                      ? (language === "ko" ? "리포스트됨" : "Reposted")
                      : (language === "ko" ? "리포스트" : "Repost")
                  }
                  onClick={handleRepost}
                />
                <IconButton
                  active={quoteOpen}
                  glyph="❝"
                  label={language === "ko" ? "인용" : "Quote"}
                  onClick={() => setQuoteOpen((o) => !o)}
                />
              </>
            ) : null}
          </div>

          {quoteOpen ? (
            <div className="mt-4 rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                {language === "ko" ? "인용 의견 작성" : "Add your quote"}
              </p>
              <textarea
                autoFocus
                className="min-h-24 w-full rounded-md border border-tint/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(e) => setQuoteBody(e.target.value)}
                placeholder={
                  language === "ko"
                    ? "이 글에 대한 생각을 적어주세요…"
                    : "Share your take on this post…"
                }
                value={quoteBody}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {STANCES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={quoteStance === s}
                    onClick={() => setQuoteStance(s)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                      quoteStance === s
                        ? "border-accent/60 bg-accent/20 text-accent-ink"
                        : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/50 hover:text-ink",
                    )}
                  >
                    {language === "ko"
                      ? s === "Bullish" ? "상승" : s === "Bearish" ? "하락" : s === "Neutral" ? "중립" : "질문"
                      : s}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={handleQuoteSubmit} type="button">
                  {language === "ko" ? "인용 게시" : "Post quote"}
                </Button>
                <Button
                  onClick={() => { setQuoteOpen(false); setQuoteBody(""); }}
                  type="button"
                  variant="secondary"
                >
                  {language === "ko" ? "취소" : "Cancel"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function QuotedPostEmbed({
  snapshot,
  language,
}: {
  snapshot: QuotedCommunityPostSnapshot;
  language: "ko" | "en";
}) {
  return (
    <div className="mt-4 rounded-xl border border-tint/10 bg-tint/[0.03] p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-tint/10 bg-tint/[0.06] text-[0.6rem] font-bold text-ink">
          {avatarFromName(snapshot.author)}
        </div>
        <p className="text-xs font-semibold text-ink">{snapshot.author}</p>
        <span className="text-xs text-muted-2">{formatRelativeTime(snapshot.publishedAt, language)}</span>
        {snapshot.stance ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.65rem] font-bold",
              snapshot.stance === "Bullish"
                ? "bg-accent/15 text-accent-ink"
                : "bg-tint/[0.06] text-muted-2",
            )}
          >
            {language === "ko"
              ? snapshot.stance === "Bullish" ? "상승"
                : snapshot.stance === "Bearish" ? "하락"
                : snapshot.stance === "Neutral" ? "중립"
                : "질문"
              : snapshot.stance}
          </span>
        ) : null}
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-ink">{snapshot.title}</p>
      <p className="mt-1 break-words text-xs leading-5 text-muted">{snapshot.preview}</p>
      {snapshot.attachments?.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {snapshot.attachments.map((a) => (
            <div key={a.id} className="overflow-hidden rounded-lg border border-tint/10">
              {a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={a.name} className="aspect-video w-full object-cover" src={a.dataUrl} />
              ) : (
                <video className="aspect-video w-full bg-black" controls src={a.dataUrl} />
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PopularPostsCard({
  posts,
  language,
}: {
  posts: CommunityPost[];
  language: "ko" | "en";
}) {
  return (
    <Card className="min-w-0 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {language === "ko" ? "인기 글" : "Popular Posts"}
      </p>
      <div className="mt-3 grid gap-2">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="flex min-w-0 items-start gap-3 rounded-xl border border-tint/10 bg-tint/[0.03] p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-xs font-bold text-accent-ink">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-ink">{post.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-2">
                <Badge tone="muted">{getCategoryLabel(post.category, language)}</Badge>
                <span>{post.commentsCount} {language === "ko" ? "댓글" : "comments"}</span>
                <span>{post.likes} {language === "ko" ? "좋아요" : "likes"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TrendingWidget({
  posts,
  language,
}: {
  posts: CommunityPost[];
  language: "ko" | "en";
}) {
  const top = posts.slice(0, 5);
  return (
    <div
      style={{
        border: "1px solid var(--cb-b1)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: "11px 14px",
          borderBottom: "1px solid var(--cb-b1)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--cb-t2)",
        }}
      >
        {language === "ko" ? "인기글 TOP 5" : "Top 5"}
      </div>
      {top.length === 0 ? (
        <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--cb-t3)" }}>
          {language === "ko" ? "아직 표시할 글이 없습니다." : "No trending posts yet."}
        </div>
      ) : (
        top.map((post, i) => (
          <div
            key={post.id}
            className="flex items-start gap-2.5"
            style={{
              padding: "10px 14px",
              borderBottom: i === top.length - 1 ? "none" : "1px solid var(--cb-b1)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: i < 3 ? "var(--cb-accent)" : "var(--cb-t3)",
                minWidth: 14,
                lineHeight: 1.3,
              }}
            >
              {i + 1}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--cb-t1)",
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                }}
              >
                {post.title}
              </div>
              <div style={{ fontSize: 11, color: "var(--cb-t3)", marginTop: 2 }}>
                {language === "ko" ? "댓글" : "comments"} {post.commentsCount} · {formatViewCount(post.views)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function formatViewCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function isDatabasePostId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getCommunitySessionId() {
  if (typeof window === "undefined") return "";
  const key = "chain-brief-community-session-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}

function CommunityGuidelinesBox({
  copy,
}: {
  copy: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Card className="min-w-0 p-4" id="community-guidelines">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {copy.community.guidelinesTitle}
      </p>
      <p className="mt-3 break-words text-sm leading-6 text-muted">{copy.community.guidelines}</p>
    </Card>
  );
}

function FloatingCommunityActions({ language }: { language: "ko" | "en" }) {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-tint/10 bg-tint/[0.08] text-lg text-ink shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition hover:border-accent/50 hover:bg-tint/[0.12]"
        aria-label={language === "ko" ? "맨 위로 이동" : "Scroll to top"}
        title={language === "ko" ? "맨 위로 이동" : "Scroll to top"}
      >
        ↑
      </button>
      <Link
        href="/community/write"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/60 bg-accent text-xl font-semibold text-white shadow-[0_18px_40px_rgba(47,123,255,0.28)] transition hover:bg-blue-500"
        aria-label={language === "ko" ? "글쓰기" : "Write post"}
        title={language === "ko" ? "글쓰기" : "Write post"}
      >
        ✎
      </Link>
    </div>
  );
}

function IconButton({
  label,
  glyph,
  onClick,
  active = false,
}: {
  label: string;
  glyph: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm transition",
        active
          ? "border-accent/60 bg-accent/15 text-accent-ink"
          : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/50 hover:text-ink",
      )}
    >
      {glyph}
    </button>
  );
}

function filterPostsByTab(posts: CommunityPost[], tab: CommunityTab) {
  if (tab === "Latest") {
    return posts;
  }

  return posts.filter((post) => {
    switch (tab) {
      case "News Reactions":
        return Boolean(post.relatedArticleSlug || post.discussionType === "news_reaction" || hasTag(post, "News Reactions"));
      case "Lounge":
        return post.postType === "general" || post.discussionType === "opinion";
      case "Chart Analysis":
        return post.postType === "chart_analysis" || hasTag(post, "Analysis");
      case "Trade Review":
        return post.postType === "trade_review";
      case "Loss Review":
        return post.postType === "loss_review";
      case "Rookie Analyst":
        return post.analystTier === "rookie_analyst" || post.analystTier === "rising_analyst";
      case "Verified Analyst":
        return post.analystTier === "verified_analyst" || post.analystTier === "partner_expert";
      default:
        return true;
    }
  });
}

function isAnalystTab(tab: CommunityTab): tab is Extract<CommunityTab, "Rookie Analyst" | "Verified Analyst"> {
  return tab === "Rookie Analyst" || tab === "Verified Analyst";
}

function isAnalysisPost(post: CommunityPost) {
  return (
    post.postType === "news_interpretation" ||
    post.postType === "chart_analysis" ||
    post.postType === "trade_review" ||
    post.postType === "loss_review" ||
    post.postType === "risk_analysis" ||
    Boolean(post.analystTier)
  );
}

function formatPostType(value: NonNullable<CommunityPost["postType"]>) {
  const labels: Record<NonNullable<CommunityPost["postType"]>, string> = {
    general: "General",
    news_interpretation: "News Analysis",
    chart_analysis: "Chart Analysis",
    trade_review: "Trade Review",
    loss_review: "Loss Review",
    risk_analysis: "Risk Analysis",
  };

  return labels[value];
}

function formatAnalystTier(value: NonNullable<CommunityPost["analystTier"]>) {
  const labels: Record<NonNullable<CommunityPost["analystTier"]>, string> = {
    user: "User",
    rookie_analyst: "Rookie Analyst",
    rising_analyst: "Rising Analyst",
    verified_analyst: "Verified Analyst",
    partner_expert: "Partner Expert",
  };

  return labels[value];
}

function sortPostsForTab(posts: CommunityPost[], tab: CommunityTab) {
  const nextPosts = [...posts];

  if (tab === "Rookie Analyst" || tab === "Verified Analyst") {
    return nextPosts.sort((a, b) => engagementScore(b) - engagementScore(a));
  }

  return nextPosts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function engagementScore(post: CommunityPost) {
  return post.likes * 2 + post.commentsCount * 3 + post.views * 0.1;
}

function postToQuoteTarget(post: CommunityPost): CommunityQuoteTarget {
  return {
    id: post.relatedArticleSlug ?? post.slug,
    slug: post.relatedArticleSlug ?? post.slug,
    title: post.relatedArticleTitle ?? post.title,
    sourceName: post.relatedArticleSource ?? post.sourceName ?? "Chain Brief",
    category: post.category,
    originalUrl: post.relatedArticleUrl ?? post.articleUrl ?? "#",
    publishedAt: post.publishedAt,
    excerpt: post.preview || post.body,
    briefSummary: post.articleSummary || post.preview || post.body,
  };
}

function hasTag(post: CommunityPost, tag: string) {
  return post.tags.some((item) => item.toLowerCase() === tag.toLowerCase());
}

function getBadgeTone(stance?: CommunityStance) {
  switch (stance) {
    case "Bullish":
      return "accent" as const;
    case "Bearish":
      return "muted" as const;
    case "Question":
      return "muted" as const;
    default:
      return "muted" as const;
  }
}

function stanceLabel(
  stance: CommunityStance | undefined,
  copy: ReturnType<typeof useI18n>["t"],
  language: "ko" | "en",
) {
  if (!stance) {
    return copy.community.neutral;
  }

  if (language === "ko") {
    switch (stance) {
      case "Bullish":
        return "상승";
      case "Bearish":
        return "하락";
      case "Neutral":
        return "중립";
      case "Question":
        return "질문";
      default:
        return copy.community.neutral;
    }
  }

  return stance;
}

function avatarFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return initials.toUpperCase() || "CB";
}

function sharePost(post: CommunityPost) {
  if (typeof window === "undefined") {
    return;
  }

  const targetUrl =
    post.relatedArticleUrl ??
    `${window.location.origin}/community${
      post.relatedArticleSlug ? `?articleSlug=${encodeURIComponent(post.relatedArticleSlug)}` : ""
    }`;
  const nav = window.navigator as Navigator & {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  };

  if (typeof nav.share === "function") {
    void nav.share({
      title: post.title,
      text: post.preview,
      url: targetUrl,
    });
    return;
  }

  if (nav.clipboard) {
    void nav.clipboard.writeText(targetUrl);
  }
}

function scrollToSection(id: string) {
  if (typeof window === "undefined") {
    return;
  }

  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}
