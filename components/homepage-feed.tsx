"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { storeCommunityQuoteTarget } from "@/lib/community";
import {
  ACTIVE_SOURCES,
  BRIEF_CATEGORIES,
  type BriefPreferences,
} from "@/lib/preferences";
import { cn } from "@/lib/cn";
import { formatBriefSummary } from "@/lib/summary";
import type { Article } from "@/lib/rss/types";
import {
  formatLocalDateTime,
  formatRelativeTime,
  formatShortDate,
  formatShortTime,
  getCategoryLabel,
} from "@/lib/i18n";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";

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
const INITIAL_VISIBLE_ARTICLES = 12;
const VISIBLE_ARTICLE_STEP = 12;
const MARKET_REFRESH_MS = 60 * 1000;

const MARKET_ASSETS = [
  { id: "bitcoin", name: "BTC" },
  { id: "ethereum", name: "ETH" },
  { id: "solana", name: "SOL" },
  { id: "binancecoin", name: "BNB" },
  { id: "ripple", name: "XRP" },
  { id: "cardano", name: "ADA" },
] as const;

type MarketAsset = {
  id: string;
  name: string;
  price: number | null;
  change24h: number | null;
};

export function HomepageFeed({ showIntro = false }: HomepageFeedProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [preferences, setPreferences] = usePreferences();
  const { t: copy, language } = useI18n(preferences.language);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [pendingArticles, setPendingArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketAssets, setMarketAssets] = useState<MarketAsset[]>(
    MARKET_ASSETS.map((asset) => ({
      ...asset,
      price: null,
      change24h: null,
    })),
  );
  const [visibleArticleCount, setVisibleArticleCount] = useState(
    INITIAL_VISIBLE_ARTICLES,
  );
  const articlesRef = useRef<Article[]>([]);

  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  useEffect(() => {
    let isMounted = true;

    async function loadMarketData() {
      try {
        const response = await fetch(
          "/api/market",
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Market request failed");
        }

        const data = (await response.json()) as {
          assets?: Array<{
            id: string;
            currentPrice?: number;
            change24h?: number;
          }>;
        };

        if (isMounted) {
          setMarketAssets(
            MARKET_ASSETS.map((asset) => {
              const entry = data.assets?.find((item) => item.id === asset.id);

              return {
                ...asset,
                price: entry?.currentPrice ?? null,
                change24h: entry?.change24h ?? null,
              };
            }),
          );
        }
      } catch {
        if (isMounted) {
          setMarketAssets(
            MARKET_ASSETS.map((asset) => ({
              ...asset,
              price: null,
              change24h: null,
            })),
          );
        }
      }
    }

    loadMarketData();
    const refreshTimer = window.setInterval(loadMarketData, MARKET_REFRESH_MS);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

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
          const nextArticles = data.articles ?? [];

          if (mode === "refresh" && hasNewArticles(articlesRef.current, nextArticles)) {
            setPendingArticles(nextArticles);
          } else {
            setArticles(nextArticles);
            setPendingArticles(null);
          }
          setLastUpdatedAt(data.refreshedAt ?? new Date().toISOString());
        }
      } catch {
        if (isMounted) {
          setError(copy.feed.loadErrorMessage);
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
  }, [copy.feed.loadErrorMessage]);

  const filteredArticles = useMemo(
    () => filterArticles(articles, preferences),
    [articles, preferences],
  );
  const visibleArticles = filteredArticles.slice(0, visibleArticleCount);
  const hasMoreArticles = visibleArticles.length < filteredArticles.length;
  const categoryCounts = useMemo(
    () => getCategoryCounts(articles, preferences),
    [articles, preferences],
  );
  const liveIssues = articles.slice(0, 5);

  function setCategory(category: string) {
    setPreferences({ ...preferences, category });
    setVisibleArticleCount(INITIAL_VISIBLE_ARTICLES);
  }

  function setSource(source: string) {
    setPreferences({
      ...preferences,
      sources: source === "All" ? ACTIVE_SOURCES : [source],
    });
    setVisibleArticleCount(INITIAL_VISIBLE_ARTICLES);
  }

  function reloadPendingArticles() {
    if (!pendingArticles) {
      return;
    }

    setArticles(pendingArticles);
    setPendingArticles(null);
    setVisibleArticleCount(INITIAL_VISIBLE_ARTICLES);
  }

  function showMoreArticles() {
    setVisibleArticleCount((current) => current + VISIBLE_ARTICLE_STEP);
  }

  function quoteArticle(article: Article) {
    storeCommunityQuoteTarget(article);
    window.location.assign("/community");
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
      <Container className="min-w-0 pb-10 pt-4 sm:pb-12 sm:pt-5 lg:pb-16">
        <div className="mb-5 grid min-w-0 gap-4 border-b border-white/10 pb-5 sm:mb-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {showIntro ? copy.feed.briefsLabel : copy.feed.homeLabel}
            </p>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {copy.feed.headline}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {copy.feed.subheadline}
            </p>
            <p className="mt-2 text-xs font-medium text-muted-2">
              {isRefreshing
                ? copy.feed.refreshing
                : copy.feed.lastUpdated(formatLastUpdated(lastUpdatedAt, language))}
            </p>
          </div>
          <MarketPulsePanel
            assets={marketAssets}
            label={copy.feed.marketPulse}
            language={preferences.language}
          />
        </div>

        <LiveIssueBar
          articles={liveIssues}
          isLoading={isLoading}
          label={copy.feed.liveIssues}
        />

        <div className="mt-6 min-w-0">
          {pendingArticles ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2">
              <span className="text-xs font-semibold text-blue-100">
                {copy.feed.newBriefsReady}
              </span>
              <button
                className="text-xs font-bold text-accent transition hover:text-blue-200"
                onClick={reloadPendingArticles}
                type="button"
              >
                {copy.feed.reloadBriefs}
              </button>
            </div>
          ) : null}
        </div>

        <CategoryTabs
          activeCategory={preferences.category}
          counts={categoryCounts}
          language={preferences.language}
          onChange={setCategory}
        />

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            {isLoading ? <LoadingState /> : null}
            {!isLoading && error ? (
              <ErrorState message={error} language={preferences.language} />
            ) : null}
            {!isLoading && !error && articles.length === 0 ? (
              <EmptyState language={preferences.language} />
            ) : null}
            {!isLoading &&
            !error &&
            articles.length > 0 &&
            filteredArticles.length === 0 ? (
              <NoMatchesState language={preferences.language} />
            ) : null}

            {!isLoading && !error && filteredArticles.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-white/10 bg-surface/78">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {copy.feed.mainFeed}
                  </p>
                  <span className="shrink-0 text-xs font-medium text-muted-2">
                    {copy.feed.briefCount(filteredArticles.length)}
                  </span>
                </div>
                <div className="divide-y divide-white/10">
                  {visibleArticles.map((article) => (
                    <TimelineItem
                      article={article}
                      expanded={expandedIds.has(article.id)}
                      key={article.id}
                      language={preferences.language}
                      onQuote={() => quoteArticle(article)}
                      onToggle={() => toggleExpanded(article.id)}
                    />
                  ))}
                </div>
                {hasMoreArticles ? (
                  <div className="border-t border-white/10 p-3 sm:p-4">
                    <Button
                      className="w-full"
                      onClick={showMoreArticles}
                      type="button"
                      variant="secondary"
                    >
                      {copy.feed.showMore}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <FeedSidebar
            articleCount={filteredArticles.length}
            preferences={preferences}
            lastUpdatedAt={lastUpdatedAt}
            onSourceChange={setSource}
          />
        </div>
      </Container>
    </section>
  );
}

function LiveIssueBar({
  articles,
  isLoading,
  label,
}: {
  articles: Article[];
  isLoading: boolean;
  label: string;
}) {
  const tickerArticles = articles.length > 0 ? [...articles, ...articles] : [];

  return (
    <div className="max-w-full overflow-hidden rounded-lg border border-accent/25 bg-accent-soft/45 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
      <div className="grid min-w-0 gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[8rem_minmax(0,1fr)] lg:items-center">
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_16px_rgba(47,123,255,0.9)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            {label}
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
                className="flex min-w-[15rem] max-w-[85vw] items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 py-2 text-sm font-medium text-ink transition hover:border-accent/50 hover:text-blue-200 sm:min-w-[18rem] sm:max-w-sm"
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
  counts,
  language,
  onChange,
}: {
  activeCategory: string;
  counts: Record<string, number>;
  language: BriefPreferences["language"];
  onChange: (category: string) => void;
}) {
  return (
    <div className="mt-5 max-w-full overflow-x-auto overscroll-x-contain border-b border-white/10 [-webkit-overflow-scrolling:touch]">
      <div className="flex w-max min-w-full gap-1">
        {BRIEF_CATEGORIES.filter((category) => category !== "Web3").map((category) => (
          <button
            className={cn(
              "shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition",
              activeCategory === category
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
            key={category}
            onClick={() => onChange(category)}
            type="button"
          >
            {getCategoryLabel(category, language)} ({counts[category] ?? 0})
          </button>
        ))}
      </div>
    </div>
  );
}

type TranslationStatus = "idle" | "loading" | "success" | "error";

type TranslationState = {
  status: TranslationStatus;
  translatedHeadline: string | null;
  translatedBody: string | null;
  isShowingTranslation: boolean;
};

const INITIAL_TRANSLATION: TranslationState = {
  status: "idle",
  translatedHeadline: null,
  translatedBody: null,
  isShowingTranslation: false,
};

function TimelineItem({
  article,
  expanded,
  language,
  onQuote,
  onToggle,
}: {
  article: Article;
  expanded: boolean;
  language: BriefPreferences["language"];
  onQuote: () => void;
  onToggle: () => void;
}) {
  const { t: copy } = useI18n(language);
  const [translation, setTranslation] = useState<TranslationState>(INITIAL_TRANSLATION);

  async function handleTranslate() {
    if (translation.status === "loading") return;

    // Already fetched — just toggle visibility (no new API call)
    if (translation.status === "success") {
      setTranslation((prev) => ({
        ...prev,
        isShowingTranslation: !prev.isShowingTranslation,
      }));
      return;
    }

    setTranslation({ ...INITIAL_TRANSLATION, status: "loading" });

    try {
      const bodyText = [formatBriefSummary(article, language), article.excerpt]
        .filter(Boolean)
        .join("\n\n");

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline: article.title, body: bodyText }),
      });

      if (!response.ok) throw new Error("translate request failed");

      const data = (await response.json()) as { headline: string; body: string };
      setTranslation({
        status: "success",
        translatedHeadline: data.headline || null,
        translatedBody: data.body || null,
        isShowingTranslation: true,
      });
    } catch {
      setTranslation({ ...INITIAL_TRANSLATION, status: "error" });
    }
  }

  const showKo = translation.status === "success" && translation.isShowingTranslation;
  const displayTitle = showKo && translation.translatedHeadline
    ? translation.translatedHeadline
    : article.title;

  return (
    <article className="group grid min-w-0 gap-3 px-3 py-3 transition hover:bg-white/[0.03] sm:grid-cols-[4.5rem_1fr] sm:px-4">
      <time
        className="text-xs font-semibold tabular-nums text-muted-2"
        dateTime={article.publishedAt}
        title={formatLocalDateTime(article.publishedAt, language)}
      >
        {formatRelativeTime(article.publishedAt, language)}
      </time>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded bg-accent/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-blue-200">
            {article.sourceName}
          </span>
          <Badge tone="muted">{getCategoryLabel(article.category, language)}</Badge>
          <span className="text-xs font-medium text-muted-2">
            {formatShortDate(article.publishedAt, language)}
          </span>
          <span className="text-xs font-medium text-muted-2">
            {article.readingTime}
          </span>
        </div>

        <a href={article.originalUrl} rel="noreferrer" target="_blank">
          <h2
            className="mt-2 break-words text-base font-semibold leading-snug text-ink transition group-hover:text-blue-100 sm:text-lg"
            key={showKo ? "ko" : "en"}
          >
            <span className={showKo ? "brief-fade-in" : undefined}>{displayTitle}</span>
          </h2>
        </a>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            className="text-sm font-semibold text-accent transition hover:text-blue-300"
            onClick={onToggle}
            type="button"
          >
            {expanded ? copy.feed.hideBrief : copy.feed.showBrief}
          </button>
          <a
            className="text-sm font-semibold text-muted transition hover:text-ink"
            href={article.originalUrl}
            rel="noreferrer"
            target="_blank"
          >
            {copy.feed.originalLink}
          </a>
          <button
            aria-label={copy.feed.quoteToCommunity}
            className="inline-flex h-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-muted transition hover:border-accent/50 hover:text-ink"
            onClick={onQuote}
            type="button"
            title={copy.feed.quoteToCommunity}
          >
            {copy.feed.discuss}
          </button>
          <TranslateButton language={language} state={translation} onClick={handleTranslate} />
        </div>

        {translation.status === "error" ? (
          <p className="mt-1.5 text-xs text-rose-300">
            {language === "ko"
              ? "번역을 불러오지 못했어요."
              : "Translation could not be loaded."}
          </p>
        ) : null}

        {expanded ? (
          <div className="mt-3 rounded-md border border-white/10 bg-background/70 p-3">
            {showKo && translation.translatedBody ? (
              <p key="body-ko" className="brief-fade-in break-words text-sm leading-6 text-ink">
                {translation.translatedBody}
              </p>
            ) : (
              <>
                <p className="break-words text-sm leading-6 text-ink">
                  {formatBriefSummary(article, language)}
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-muted">{article.excerpt}</p>
              </>
            )}
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

function TranslateButton({
  language,
  state,
  onClick,
}: {
  language: BriefPreferences["language"];
  state: TranslationState;
  onClick: () => void;
}) {
  const isLoading = state.status === "loading";
  const showingKo = state.status === "success" && state.isShowingTranslation;
  const translateLoadingLabel = language === "ko" ? "번역 중..." : "Translating...";
  const showEnglishLabel = language === "ko" ? "영어로 보기" : "Show English";
  const showKoreanLabel = language === "ko" ? "한국어로 보기" : "Show Korean";

  let label: string;
  if (isLoading) {
    label = translateLoadingLabel;
  } else if (showingKo) {
    label = showEnglishLabel;
  } else {
    label = showKoreanLabel;
  }

  return (
    <button
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-muted transition hover:border-accent/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      disabled={isLoading}
      onClick={onClick}
      type="button"
      aria-label={label}
    >
      {isLoading ? (
        <svg
          aria-hidden="true"
          className="h-3 w-3 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            fill="currentColor"
          />
        </svg>
      ) : null}
      <span>{label}</span>
    </button>
  );
}

function MarketPulsePanel({
  assets,
  label,
  language,
}: {
  assets: MarketAsset[];
  label: string;
  language: BriefPreferences["language"];
}) {
  const { t: copy } = useI18n(language);
  const hasData = assets.some((asset) => asset.price !== null);

  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {label}
          </p>
          <p className="mt-1 text-xs text-muted-2">{copy.feed.marketWatch}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-2">
          Coingecko
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {assets.map((asset) => (
          <div
            className={cn(
              "min-w-0 rounded-md border px-3 py-2",
              asset.change24h === null
                ? "border-white/10 bg-white/[0.03]"
                : asset.change24h >= 0
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-rose-500/30 bg-rose-500/10",
            )}
            key={asset.id}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-2">
                {asset.name}
              </span>
              <span
                className={cn(
                  "text-[0.68rem] font-semibold",
                  asset.change24h === null
                    ? "text-muted-2"
                    : asset.change24h >= 0
                      ? "text-emerald-300"
                      : "text-rose-300",
                )}
              >
                {asset.change24h === null ? "--" : formatChange(asset.change24h)}
              </span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-ink">
              {asset.price === null ? copy.feed.marketUnavailable : formatPrice(asset.price)}
            </p>
          </div>
        ))}
      </div>
      {!hasData ? (
        <p className="mt-3 text-xs text-muted-2">{copy.feed.marketUnavailable}</p>
      ) : null}
    </Card>
  );
}

function FeedSidebar({
  articleCount,
  lastUpdatedAt,
  onSourceChange,
  preferences,
}: {
  articleCount: number;
  lastUpdatedAt: string | null;
  onSourceChange: (source: string) => void;
  preferences: BriefPreferences;
}) {
  const hasIncludeKeywords = preferences.includeKeywords.trim().length > 0;
  const hasExcludeKeywords = preferences.excludeKeywords.trim().length > 0;
  const { t: copy } = useI18n(preferences.language);
  const allSourcesSelected = preferences.sources.length === ACTIVE_SOURCES.length;

  return (
    <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
      <Card className="min-w-0 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.feed.activeSources}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            aria-pressed={allSourcesSelected}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition",
              allSourcesSelected
                ? "border-accent/60 bg-accent/20 text-blue-100"
                : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/50 hover:text-ink",
            )}
            onClick={() => onSourceChange("All")}
            type="button"
          >
            {getCategoryLabel("All", preferences.language)}
          </button>
          {ACTIVE_SOURCES.map((source) => (
            <button
              aria-pressed={!allSourcesSelected && preferences.sources.includes(source)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                !allSourcesSelected && preferences.sources.includes(source)
                  ? "border-accent/60 bg-accent/20 text-blue-100"
                  : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/50 hover:text-ink",
              )}
              key={source}
              onClick={() => onSourceChange(source)}
              type="button"
            >
              {source}
            </button>
          ))}
        </div>
      </Card>

      <Card className="min-w-0 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.feed.activeFilters}
        </p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex min-w-0 justify-between gap-3">
            <dt className="text-muted">{copy.feed.category}</dt>
            <dd className="break-words text-right font-semibold text-ink">
              {getCategoryLabel(preferences.category, preferences.language)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{copy.feed.matches}</dt>
            <dd className="font-semibold text-ink">{articleCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{copy.feed.language}</dt>
            <dd className="text-right font-semibold text-ink">
              {preferences.language === "ko"
                ? copy.preferences.korean
                : copy.preferences.english}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{copy.feed.lastUpdatedShort}</dt>
            <dd className="mt-1 break-words text-ink">
              {formatLastUpdated(lastUpdatedAt, preferences.language)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{copy.feed.include}</dt>
            <dd className="mt-1 break-words text-ink">
              {hasIncludeKeywords ? preferences.includeKeywords : copy.feed.none}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{copy.feed.exclude}</dt>
            <dd className="mt-1 text-ink">
              {hasExcludeKeywords ? preferences.excludeKeywords : copy.feed.none}
            </dd>
          </div>
        </dl>
        <Button className="mt-4 w-full" href="/settings" variant="secondary">
          {copy.feed.customizeFeed}
        </Button>
      </Card>

      <Card className="min-w-0 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.feed.disclaimerTitle}
        </p>
        <p className="mt-3 break-words text-sm leading-6 text-muted">
          {copy.feed.disclaimer}
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

function ErrorState({
  message,
  language,
}: {
  message: string;
  language: BriefPreferences["language"];
}) {
  const { t: copy } = useI18n(language);

  return (
    <Card className="border-danger/30 bg-danger/10 p-6">
      <p className="text-lg font-semibold text-ink">{copy.feed.errorTitle}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
    </Card>
  );
}

function EmptyState({ language }: { language: BriefPreferences["language"] }) {
  const { t: copy } = useI18n(language);

  return (
    <Card className="p-6">
      <p className="text-lg font-semibold text-ink">{copy.feed.emptyTitle}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{copy.feed.emptyDescription}</p>
    </Card>
  );
}

function NoMatchesState({ language }: { language: BriefPreferences["language"] }) {
  const { t: copy } = useI18n(language);

  return (
    <Card className="p-6">
      <p className="text-lg font-semibold text-ink">{copy.feed.noMatchesTitle}</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        {copy.feed.noMatchesDescription}
      </p>
      <Button className="mt-5 w-full sm:w-auto" href="/settings" variant="secondary">
        {copy.feed.updateSettings}
      </Button>
    </Card>
  );
}

function filterArticles(articles: Article[], preferences: BriefPreferences) {
  return filterArticlesWithOptions(articles, preferences, { includeCategory: true });
}

function hasNewArticles(currentArticles: Article[], nextArticles: Article[]) {
  const currentIds = new Set(currentArticles.map((article) => article.id));

  return nextArticles.some((article) => !currentIds.has(article.id));
}

function getCategoryCounts(articles: Article[], preferences: BriefPreferences) {
  const baseMatches = filterArticlesWithOptions(articles, preferences, {
    includeCategory: false,
  });
  const counts = Object.fromEntries(
    BRIEF_CATEGORIES.map((category) => [category, 0]),
  ) as Record<string, number>;

  counts.All = baseMatches.length;

  for (const article of baseMatches) {
    for (const category of BRIEF_CATEGORIES) {
      if (
        category !== "All" &&
        (article.category === category || article.tags.includes(category))
      ) {
        counts[category] += 1;
      }
    }
  }

  return counts;
}

function filterArticlesWithOptions(
  articles: Article[],
  preferences: BriefPreferences,
  options: { includeCategory: boolean },
) {
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
      !options.includeCategory ||
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

function formatLastUpdated(
  value: string | null,
  language: BriefPreferences["language"],
) {
  if (!value) {
    return getWaitingLabel(language);
  }

  return formatShortTime(value, language);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 4,
  }).format(value);
}

function formatChange(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function getWaitingLabel(language: BriefPreferences["language"]) {
  return language === "ko" ? "첫 새로고침 대기 중" : "Waiting for first refresh";
}
