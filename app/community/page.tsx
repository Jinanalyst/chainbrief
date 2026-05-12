"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  addOpinionPost,
  addQuotePost,
  clearCommunityQuoteTarget,
  COMMUNITY_POSTS_CHANGED_EVENT,
  COMMUNITY_QUOTE_CHANGED_EVENT,
  readCommunityPosts,
  readCommunityQuoteTarget,
  type CommunityPost,
  type CommunityQuoteTarget,
  type CommunityStance,
} from "@/lib/community";
import { cn } from "@/lib/cn";
import { formatLocalDateTime, formatRelativeTime, getCategoryLabel } from "@/lib/i18n";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";

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

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [quoteTarget, setQuoteTarget] = useState<CommunityQuoteTarget | null>(null);
  const [activeTab, setActiveTab] = useState<CommunityTab>("Latest");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [stance, setStance] = useState<CommunityStance>("Neutral");
  const [selectedArticleSlug] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return new URLSearchParams(window.location.search).get("articleSlug")?.trim() || null;
  });

  useEffect(() => {
    function syncCommunityState() {
      setPosts(readCommunityPosts());
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

  const popularPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => engagementScore(b) - engagementScore(a))
      .slice(0, 5);
  }, [posts]);

  function submitOpinion() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      return;
    }

    if (focusedTarget) {
      addQuotePost(trimmedBody, focusedTarget, {
        title: trimmedTitle,
        stance,
      });
    } else {
      addOpinionPost(trimmedBody, activeTab === "Latest" ? undefined : activeTab, {
        title: trimmedTitle,
        stance,
        postType:
          activeTab === "Chart Analysis"
            ? "chart_analysis"
            : activeTab === "Trade Review"
              ? "trade_review"
              : activeTab === "Loss Review"
                ? "loss_review"
                : activeTab === "News Reactions"
                  ? "news_interpretation"
                  : "general",
        analystTier:
          activeTab === "Rookie Analyst"
            ? "rookie_analyst"
            : activeTab === "Verified Analyst"
              ? "verified_analyst"
              : undefined,
        discussionType:
          activeTab === "Chart Analysis"
            ? "analysis"
            : activeTab === "News Reactions"
              ? "news_reaction"
              : "opinion",
      });
    }

    setTitle("");
    setBody("");
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
    <main className="site-grid min-h-screen overflow-x-hidden pb-36">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)_18rem]">
            <div className="hidden min-w-0 lg:block">
              <CommunitySidebar language={language} onAction={handleSidebarAction} />
            </div>

            <div className="min-w-0">
              <CommunityHeader language={language} />

              {!focusedTarget ? (
                <div className="mt-4 grid gap-4">
                  <CommunityTabs activeTab={activeTab} language={language} onChange={setActiveTab} />
                  <CommunityBanner language={language} />
                  <AnalystPathSection />
                  <div className="lg:hidden">
                    <PopularPostsCard language={language} posts={popularPosts} />
                  </div>
                  <OpinionComposer
                    body={body}
                    copy={copy}
                    focusedTarget={null}
                    language={language}
                    onBodyChange={setBody}
                    onClearTarget={() => undefined}
                    onSubmit={submitOpinion}
                    onTitleChange={setTitle}
                    onStanceChange={setStance}
                    stance={stance}
                    title={title}
                  />
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  <RelatedNewsCard copy={copy} language={language} target={focusedTarget} />
                  <OpinionComposer
                    body={body}
                    copy={copy}
                    focusedTarget={focusedTarget}
                    language={language}
                    onBodyChange={setBody}
                    onClearTarget={() => {
                      clearCommunityQuoteTarget();
                      setQuoteTarget(null);
                    }}
                    onSubmit={submitOpinion}
                    onTitleChange={setTitle}
                    onStanceChange={setStance}
                    stance={stance}
                    title={title}
                  />
                </div>
              )}

              <div className="mt-6 lg:hidden">
                {!focusedTarget ? null : null}
              </div>

              <div id="community-feed" className="mt-6 grid gap-3 pb-4">
                {visiblePosts.length === 0 ? (
                  <Card className="p-5">
                    <p className="text-sm leading-6 text-muted">
                      {selectedArticleSlug
                        ? language === "ko"
                          ? "이 뉴스에 대한 토론이 아직 없습니다. 첫 의견을 남겨보세요."
                          : "No discussion yet for this news item. Share the first take."
                        : language === "ko"
                          ? "아직 커뮤니티 글이 없습니다. 첫 의견을 남겨보세요."
                          : "No community posts yet. Share the first take."}
                    </p>
                  </Card>
                ) : (
                  visiblePosts.map((post) => (
                    <CommunityPostCard key={post.id} copy={copy} language={language} post={post} />
                  ))
                )}
              </div>
            </div>

            <div className="hidden min-w-0 lg:block">
              {!focusedTarget ? <TrendingAndGuidelines posts={popularPosts} copy={copy} /> : null}
            </div>
          </div>
        </Container>
      </section>

      <FloatingCommunityActions language={language} />
    </main>
  );
}

function CommunityHeader({ language }: { language: "ko" | "en" }) {
  return (
    <header className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        {language === "ko" ? "커뮤니티" : "Community"}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        {language === "ko" ? "커뮤니티" : "Community"}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        {language === "ko"
          ? "시장 의견, 뉴스 반응, 그리고 크립토 리서치 아이디어를 빠르게 나누세요."
          : "Share market thoughts, news reactions, and crypto research ideas."}
      </p>
    </header>
  );
}

function CommunitySidebar({
  language,
  onAction,
}: {
  language: "ko" | "en";
  onAction: (action: SidebarAction) => void;
}) {
  return (
    <Card className="min-w-0 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {language === "ko" ? "둘러보기" : "Explore"}
      </p>
      <div className="mt-3 grid gap-2">
        {EXPLORE_ITEMS.map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => onAction(item.action)}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-left text-sm transition hover:border-accent/50 hover:bg-white/[0.05]"
          >
            <span className="min-w-0 break-words font-medium text-ink">
              {language === "ko" ? item.ko : item.en}
            </span>
            <span className="shrink-0 text-sm text-muted">→</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function CommunityBanner({ language }: { language: "ko" | "en" }) {
  return (
    <Card id="community-banner" className="min-w-0 overflow-hidden border-accent/20 bg-[#08172c] p-0">
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
          <Button href="/community/new" variant="primary">
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

  return (
    <div className="max-w-full overflow-x-auto border-b border-white/10 [-webkit-overflow-scrolling:touch]">
      <div className="flex w-max min-w-full gap-2 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => onChange(tab)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition",
              activeTab === tab
                ? "border-accent bg-accent/15 text-blue-100"
                : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/50 hover:text-ink",
            )}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/20 text-[10px]">
              {tabGlyphs[tab]}
            </span>
            <span>{tabLabels[tab]}</span>
          </button>
        ))}
      </div>
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
              <span className="rounded-md border border-accent/30 bg-accent/15 px-2 py-1 text-xs font-bold text-blue-100">
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
            <span className="font-semibold text-blue-100">{value}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskNotice() {
  return (
    <div className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2">
      <p className="text-xs leading-5 text-amber-100">{INVESTMENT_NOTICE}</p>
    </div>
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
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-accent/15 text-sm font-bold text-blue-100">
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
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
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
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
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
                className="mt-2 min-h-32 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
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
                    ? "border-accent/60 bg-accent/20 text-blue-100"
                    : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/50 hover:text-ink",
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
}: {
  post: CommunityPost;
  language: "ko" | "en";
  copy: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-bold text-ink">
          {post.avatar ?? avatarFromName(post.author)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-ink">{post.author}</p>
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

          <h3 className="mt-3 break-words text-lg font-semibold text-ink">{post.title}</h3>
          <p
            className="mt-2 break-words text-sm leading-6 text-muted"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {post.preview}
          </p>

          {post.relatedArticleTitle ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
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

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-2">
            <span>{post.likes} {language === "ko" ? "좋아요" : "likes"}</span>
            <span>{post.commentsCount} {copy.community.comments}</span>
            <span>{post.views} {copy.community.views}</span>
            {post.tags[0] ? <Badge tone="muted">{post.tags[0]}</Badge> : null}
          </div>

          {post.analystTier ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Analyst Score
                </p>
                <span className="text-xs font-semibold text-blue-100">
                  {formatAnalystTier(post.analystTier)}
                </span>
              </div>
              <AnalystScoreCard compact />
            </div>
          ) : null}

          {isAnalysisPost(post) ? <div className="mt-4"><RiskNotice /></div> : null}

          <div className="mt-4 flex items-center gap-2">
            <IconButton label={language === "ko" ? "북마크" : "Bookmark"} glyph="⌁" />
            <IconButton
              label={language === "ko" ? "공유" : "Share"}
              glyph="↗"
              onClick={() => sharePost(post)}
            />
          </div>
        </div>
      </div>
    </Card>
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
            className="flex min-w-0 items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-xs font-bold text-blue-100">
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

function TrendingAndGuidelines({
  posts,
  copy,
}: {
  posts: CommunityPost[];
  copy: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <div className="space-y-3">
      <Card className="min-w-0 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.community.trendingDiscussions}
        </p>
        <div className="mt-3 grid gap-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="break-words text-sm font-semibold text-ink">{post.title}</p>
              <p className="mt-1 text-xs text-muted-2">
                {post.relatedArticleSource ?? post.author}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-2">
                <span>{post.commentsCount} {copy.community.comments}</span>
                <span>{post.likes} likes</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <CommunityGuidelinesBox copy={copy} />
    </div>
  );
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
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-lg text-ink shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition hover:border-accent/50 hover:bg-white/[0.12]"
        aria-label={language === "ko" ? "맨 위로 이동" : "Scroll to top"}
        title={language === "ko" ? "맨 위로 이동" : "Scroll to top"}
      >
        ↑
      </button>
      <Link
        href="/community/new"
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
}: {
  label: string;
  glyph: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm text-muted transition hover:border-accent/50 hover:text-ink"
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
