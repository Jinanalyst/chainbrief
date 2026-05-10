"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/brand-logo";
import {
  ACTIVE_SOURCES,
  BRIEF_CATEGORIES,
  defaultPreferences,
  PREFERENCES_STORAGE_KEY,
  type BriefPreferences,
} from "@/lib/preferences";
import { cn } from "@/lib/cn";
import { formatBriefSummary } from "@/lib/summary";
import type { Article } from "@/lib/rss/types";

type BriefsResponse = {
  articles: Article[];
  count: number;
  refreshedAt: string;
  error?: string;
};

type HomepageFeedProps = {
  showIntro?: boolean;
};

const FEED_REFRESH_MS = 5 * 60 * 1000;

export function HomepageFeed({ showIntro = false }: HomepageFeedProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [preferences, setPreferences] =
    useState<BriefPreferences>(() => readStoredPreferences());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    let isMounted = true;

    async function loadArticles(mode: "initial" | "refresh" = "initial") {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        setError(null);

        const response = await fetch(`/api/briefs?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as BriefsResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error ?? "RSS request failed");
        }

        if (isMounted) {
          setArticles(data.articles ?? []);
          setLastUpdatedAt(data.refreshedAt ?? new Date().toISOString());
        }
      } catch {
        if (isMounted) {
          setError("Chain Brief could not load RSS briefings right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    loadArticles();
    const refreshTimer = window.setInterval(() => {
      loadArticles("refresh");
    }, FEED_REFRESH_MS);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const filteredArticles = useMemo(
    () => filterArticles(articles, preferences),
    [articles, preferences],
  );
  const liveIssues = articles.slice(0, 5);
  const copy = getCopy(preferences.language);

  function setCategory(category: string) {
    setPreferences({ ...preferences, category });
  }

  function toggleExpanded(articleId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }

      return next;
    });
  }

  return (
    <section className="border-t border-white/10 bg-background/72">
      <Container className="pb-12 pt-5 lg:pb-16">
        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <BrandLogo full />
          <p className="max-w-xl text-sm leading-6 text-muted">
            A compact crypto RSS briefing feed with live refresh, category
            filters, source controls, and Korean-English summary formatting.
          </p>
        </div>

        <LiveIssueBar articles={liveIssues} isLoading={isLoading} />

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {showIntro ? copy.briefsLabel : copy.homeLabel}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {copy.headline}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {copy.subheadline}
            </p>
            <p className="mt-2 text-xs font-medium text-muted-2">
              {isRefreshing ? copy.refreshing : copy.lastUpdated(lastUpdatedAt)}
            </p>
          </div>
          <Button href="/settings" variant="secondary">
            {copy.customizeFeed}
          </Button>
        </div>

        <CategoryTabs
          activeCategory={preferences.category}
          onChange={setCategory}
        />

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            {isLoading ? <LoadingState /> : null}
            {!isLoading && error ? <ErrorState message={error} /> : null}
            {!isLoading && !error && articles.length === 0 ? <EmptyState /> : null}
            {!isLoading &&
            !error &&
            articles.length > 0 &&
            filteredArticles.length === 0 ? (
              <NoMatchesState />
            ) : null}

            {!isLoading && !error && filteredArticles.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-white/10 bg-surface/78">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {copy.mainFeed}
                  </p>
                  <span className="text-xs font-medium text-muted-2">
                    {copy.briefCount(filteredArticles.length)}
                  </span>
                </div>
                <div className="divide-y divide-white/10">
                  {filteredArticles.slice(0, 50).map((article) => (
                    <TimelineItem
                      article={article}
                      expanded={expandedIds.has(article.id)}
                      key={article.id}
                      language={preferences.language}
                      onToggle={() => toggleExpanded(article.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <FeedSidebar
            articleCount={filteredArticles.length}
            preferences={preferences}
            lastUpdatedAt={lastUpdatedAt}
          />
        </div>
      </Container>
    </section>
  );
}

function LiveIssueBar({
  articles,
  isLoading,
}: {
  articles: Article[];
  isLoading: boolean;
}) {
  const tickerArticles = articles.length > 0 ? [...articles, ...articles] : [];

  return (
    <div className="overflow-hidden rounded-lg border border-accent/25 bg-accent-soft/45 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
      <div className="grid gap-3 px-4 py-3 lg:grid-cols-[8rem_minmax(0,1fr)] lg:items-center">
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_16px_rgba(47,123,255,0.9)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            Live Issues
          </p>
        </div>

        <div className="live-issues-mask overflow-hidden">
          {isLoading ? (
            <div className="flex gap-3">
              {[0, 1, 2].map((item) => (
                <span
                  className="h-7 min-w-64 animate-pulse rounded-full bg-white/10"
                  key={item}
                />
              ))}
            </div>
          ) : (
            <div className="live-issues-track flex gap-3 will-change-transform">
              {tickerArticles.map((article, index) => (
                <a
                  className="flex min-w-[18rem] max-w-sm items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 py-2 text-sm font-medium text-ink transition hover:border-accent/50 hover:text-blue-200"
                  href={article.originalUrl}
                  key={`${article.id}-${index}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-blue-200">
                    {article.sourceName}
                  </span>
                  <span className="truncate">{article.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryTabs({
  activeCategory,
  onChange,
}: {
  activeCategory: string;
  onChange: (category: string) => void;
}) {
  return (
    <div className="mt-5 overflow-x-auto border-b border-white/10">
      <div className="flex min-w-max gap-1">
        {BRIEF_CATEGORIES.filter((category) => category !== "Web3").map((category) => (
          <button
            className={cn(
              "border-b-2 px-3 py-3 text-sm font-semibold transition",
              activeCategory === category
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
            key={category}
            onClick={() => onChange(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimelineItem({
  article,
  expanded,
  language,
  onToggle,
}: {
  article: Article;
  expanded: boolean;
  language: BriefPreferences["language"];
  onToggle: () => void;
}) {
  const copy = getCopy(language);

  return (
    <article className="group grid gap-3 px-4 py-3 transition hover:bg-white/[0.03] sm:grid-cols-[4.5rem_1fr]">
      <time className="text-xs font-semibold tabular-nums text-muted-2">
        {formatTime(article.publishedAt)}
      </time>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-accent/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-blue-200">
            {article.sourceName}
          </span>
          <Badge tone="muted">{article.category}</Badge>
          <span className="text-xs font-medium text-muted-2">
            {formatDate(article.publishedAt)}
          </span>
          <span className="text-xs font-medium text-muted-2">
            {article.readingTime}
          </span>
        </div>

        <a href={article.originalUrl} rel="noreferrer" target="_blank">
          <h2 className="mt-2 text-base font-semibold leading-snug text-ink transition group-hover:text-blue-100 sm:text-lg">
            {article.title}
          </h2>
        </a>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            className="text-sm font-semibold text-accent transition hover:text-blue-300"
            onClick={onToggle}
            type="button"
          >
            {expanded ? copy.hideBrief : copy.showBrief}
          </button>
          <a
            className="text-sm font-semibold text-muted transition hover:text-ink"
            href={article.originalUrl}
            rel="noreferrer"
            target="_blank"
          >
            {copy.originalLink}
          </a>
        </div>

        {expanded ? (
          <div className="mt-3 rounded-md border border-white/10 bg-background/70 p-3">
            <p className="text-sm leading-6 text-ink">
              {formatBriefSummary(article, language)}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">{article.excerpt}</p>
            {article.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-muted"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function FeedSidebar({
  articleCount,
  lastUpdatedAt,
  preferences,
}: {
  articleCount: number;
  lastUpdatedAt: string | null;
  preferences: BriefPreferences;
}) {
  const hasIncludeKeywords = preferences.includeKeywords.trim().length > 0;
  const hasExcludeKeywords = preferences.excludeKeywords.trim().length > 0;
  const copy = getCopy(preferences.language);

  return (
    <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.activeSources}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ACTIVE_SOURCES.map((source) => (
            <Badge
              className={
                preferences.sources.includes(source) ? undefined : "opacity-45"
              }
              key={source}
              tone="muted"
            >
              {source}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.activeFilters}
        </p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{copy.category}</dt>
            <dd className="font-semibold text-ink">{preferences.category}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{copy.matches}</dt>
            <dd className="font-semibold text-ink">{articleCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{copy.language}</dt>
            <dd className="font-semibold text-ink">
              {preferences.language === "ko" ? "Korean" : "English"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{copy.lastUpdatedShort}</dt>
            <dd className="mt-1 text-ink">{formatLastUpdated(lastUpdatedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">{copy.include}</dt>
            <dd className="mt-1 text-ink">
              {hasIncludeKeywords ? preferences.includeKeywords : copy.none}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{copy.exclude}</dt>
            <dd className="mt-1 text-ink">
              {hasExcludeKeywords ? preferences.excludeKeywords : copy.none}
            </dd>
          </div>
        </dl>
        <Button className="mt-4 w-full" href="/settings" variant="secondary">
          {copy.customizeFeed}
        </Button>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.disclaimerTitle}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          {copy.disclaimer}
        </p>
      </Card>
    </aside>
  );
}

function LoadingState() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-surface/78">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          className="grid animate-pulse gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 sm:grid-cols-[4.5rem_1fr]"
          key={item}
        >
          <div className="h-4 w-12 rounded bg-white/10" />
          <div>
            <div className="flex gap-2">
              <div className="h-5 w-24 rounded bg-white/10" />
              <div className="h-5 w-20 rounded bg-white/10" />
            </div>
            <div className="mt-4 h-5 w-4/5 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-danger/30 bg-danger/10 p-6">
      <p className="text-lg font-semibold text-ink">RSS fetching failed.</p>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="p-6">
      <p className="text-lg font-semibold text-ink">No briefings available.</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        The active RSS feeds returned no articles. Chain Brief will check again
        on the next refresh interval.
      </p>
    </Card>
  );
}

function NoMatchesState() {
  return (
    <Card className="p-6">
      <p className="text-lg font-semibold text-ink">
        No briefs match your current settings.
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">
        Try a broader category, source selection, or keyword filter.
      </p>
      <Button className="mt-5" href="/settings" variant="secondary">
        Update Settings
      </Button>
    </Card>
  );
}

function filterArticles(articles: Article[], preferences: BriefPreferences) {
  const includeKeywords = parseKeywords(preferences.includeKeywords);
  const excludeKeywords = parseKeywords(preferences.excludeKeywords);

  return articles.filter((article) => {
    const searchableText = [
      article.title,
      article.excerpt,
      article.briefSummary,
      article.rawContentSnippet,
      article.category,
      article.sourceName,
      ...article.tags,
    ]
      .join(" ")
      .toLowerCase();

    const sourceMatches = preferences.sources.includes(article.sourceName);
    const categoryMatches =
      preferences.category === "All" ||
      article.category === preferences.category ||
      article.tags.includes(preferences.category);
    const includesRequired =
      includeKeywords.length === 0 ||
      includeKeywords.some((keyword) => searchableText.includes(keyword));
    const excludesBlocked = excludeKeywords.some((keyword) =>
      searchableText.includes(keyword),
    );

    return sourceMatches && categoryMatches && includesRequired && !excludesBlocked;
  });
}

function parseKeywords(value: string) {
  return value
    .split(/[,\n]/)
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

function readStoredPreferences(): BriefPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);

  if (!stored) {
    return defaultPreferences;
  }

  try {
    return { ...defaultPreferences, ...JSON.parse(stored) };
  } catch {
    return defaultPreferences;
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatLastUpdated(value: string | null) {
  if (!value) {
    return "Waiting for first refresh";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCopy(language: BriefPreferences["language"]) {
  if (language === "ko") {
    return {
      activeFilters: "활성 필터",
      activeSources: "활성 RSS 소스",
      briefCount: (count: number) => `${count}개 브리프`,
      briefsLabel: "브리프",
      category: "카테고리",
      customizeFeed: "피드 설정",
      disclaimer:
        "Chain Brief는 공개 RSS 메타데이터만 사용합니다. 빠른 스캐닝용 정보이며 투자 조언이 아닙니다. 의사결정 전 원문을 확인하세요.",
      disclaimerTitle: "안내",
      exclude: "제외",
      headline: "Crypto news, simplified.",
      hideBrief: "브리프 숨기기",
      homeLabel: "홈",
      include: "포함",
      language: "언어",
      lastUpdated: (value: string | null) =>
        `자동 새로고침: 5분마다 · 최근 업데이트 ${formatLastUpdated(value)}`,
      lastUpdatedShort: "최근 업데이트",
      mainFeed: "메인 피드",
      matches: "매칭",
      none: "없음",
      originalLink: "원문 보기",
      refreshing: "새 브리프 확인 중...",
      showBrief: "브리프 보기",
      subheadline:
        "RSS 헤드라인을 자동으로 새로고침하고, 소스·카테고리·키워드 기준으로 빠르게 필터링합니다.",
    };
  }

  return {
    activeFilters: "Active Filters",
    activeSources: "Active RSS Sources",
    briefCount: (count: number) => `${count} briefs`,
    briefsLabel: "Briefs",
    category: "Category",
    customizeFeed: "Customize Feed",
    disclaimer:
      "Chain Brief uses public RSS metadata only. Briefs are for fast scanning, not financial advice. Open original sources before making decisions.",
    disclaimerTitle: "Disclaimer",
    exclude: "Exclude",
    headline: "Crypto news, simplified.",
    hideBrief: "Hide brief",
    homeLabel: "Home",
    include: "Include",
    language: "Language",
    lastUpdated: (value: string | null) =>
      `Auto-refresh: every 5 min · Last updated ${formatLastUpdated(value)}`,
    lastUpdatedShort: "Last updated",
    mainFeed: "Main Feed",
    matches: "Matches",
    none: "None",
    originalLink: "Original link",
    refreshing: "Checking for new briefs...",
    showBrief: "Show brief",
    subheadline:
      "Auto-refreshing RSS headlines with source, category, and keyword filters for fast scanning.",
  };
}
