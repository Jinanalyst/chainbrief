"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  ARTICLE_SENTIMENT_CHANGED_EVENT,
  readArticleSentiment,
  readAuthorName,
  reactToArticle,
  storeCommunityQuoteTarget,
  type ArticleReaction,
  type ArticleSentiment,
} from "@/lib/community";
import {
  ACTIVE_SOURCES,
  BRIEF_CATEGORIES,
  STOCK_REGIONS,
  STOCK_TYPES,
  type BriefPreferences,
} from "@/lib/preferences";
import { readCustomBriefSources } from "@/lib/custom-brief-sources";
import {
  readCustomRssSources,
  type CustomRssSource,
} from "@/lib/custom-rss-sources";
import {
  CUSTOM_BRIEF_CATEGORIES_CHANGED_EVENT,
  addCustomBriefCategory,
  readCustomBriefCategories,
  removeCustomBriefCategory,
} from "@/lib/custom-brief-categories";
import {
  BRIEF_SOURCE_CATEGORY_OVERRIDES_CHANGED_EVENT,
  readBriefSourceCategoryOverrides,
  setBriefSourceCategoryOverride,
  type BriefSourceCategoryOverrides,
} from "@/lib/brief-source-category-overrides";
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

export function HomepageFeed({ showIntro = false }: HomepageFeedProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [customSources, setCustomSources] = useState<CustomRssSource[]>([]);
  const [customBriefCategories, setCustomBriefCategories] = useState<string[]>([]);
  const [briefSourceOverrides, setBriefSourceOverrides] = useState<BriefSourceCategoryOverrides>({});
  const [newBriefCategoryName, setNewBriefCategoryName] = useState("");
  const [preferences, setPreferences] = usePreferences();
  const { t: copy, language } = useI18n(preferences.language);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [pendingArticles, setPendingArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleArticleCount, setVisibleArticleCount] = useState(
    INITIAL_VISIBLE_ARTICLES,
  );
  const articlesRef = useRef<Article[]>([]);

  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  useEffect(() => {
    function syncCustomSources() {
      setCustomSources(readCustomRssSources());
    }
    function syncCustomBriefCategories() {
      setCustomBriefCategories(readCustomBriefCategories());
    }
    function syncBriefSourceOverrides() {
      setBriefSourceOverrides(readBriefSourceCategoryOverrides());
    }
    function syncAll() {
      syncCustomSources();
      syncCustomBriefCategories();
      syncBriefSourceOverrides();
    }

    const timer = window.setTimeout(syncAll, 0);
    window.addEventListener("storage", syncAll);
    window.addEventListener("chain-brief-custom-rss-sources-changed", syncCustomSources);
    window.addEventListener(
      CUSTOM_BRIEF_CATEGORIES_CHANGED_EVENT,
      syncCustomBriefCategories,
    );
    window.addEventListener(
      BRIEF_SOURCE_CATEGORY_OVERRIDES_CHANGED_EVENT,
      syncBriefSourceOverrides,
    );

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", syncAll);
      window.removeEventListener(
        "chain-brief-custom-rss-sources-changed",
        syncCustomSources,
      );
      window.removeEventListener(
        CUSTOM_BRIEF_CATEGORIES_CHANGED_EVENT,
        syncCustomBriefCategories,
      );
      window.removeEventListener(
        BRIEF_SOURCE_CATEGORY_OVERRIDES_CHANGED_EVENT,
        syncBriefSourceOverrides,
      );
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

        const enabledCustomSources = customSources.filter(
          (source) =>
            source.enabled &&
            source.type === "rss" &&
            (source.category === "Stock Market" ||
              source.category === "Crypto" ||
              source.category === "Other"),
        );
        const response =
          enabledCustomSources.length > 0
            ? await fetch(`/api/briefs?ts=${Date.now()}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({ sources: enabledCustomSources }),
              })
            : await fetch(`/api/briefs?ts=${Date.now()}`, {
                cache: "no-store",
              });
        const data = (await response.json()) as BriefsResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error ?? "RSS request failed");
        }

        if (isMounted) {
          let nextArticles = data.articles ?? [];

          const customSources = readCustomBriefSources().filter((s) => s.enabled);
          if (customSources.length > 0) {
            try {
              const customRes = await fetch("/api/brief-sources", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sources: customSources }),
                cache: "no-store",
              });
              if (customRes.ok) {
                const customData = (await customRes.json()) as BriefsResponse;
                const combined = [...nextArticles, ...(customData.articles ?? [])];
                combined.sort(
                  (a, b) =>
                    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
                );
                nextArticles = combined.slice(0, 120);
              }
            } catch {
              // custom sources failing silently — main feed still shows
            }
          }

          if (!isMounted) return;

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
  }, [copy.feed.loadErrorMessage, customSources]);

  const availableSources = useMemo(() => {
    const sourceNames = articles.map((article) => article.sourceName);
    return Array.from(new Set([...ACTIVE_SOURCES, ...sourceNames]));
  }, [articles]);

  const dynamicBriefCategories = useMemo(() => {
    const fromSources = customSources
      .filter((s) => s.enabled)
      .map((s) => s.customCategory?.trim())
      .filter((c): c is string => Boolean(c));
    const fromOverrides = Object.values(briefSourceOverrides)
      .map((c) => c.trim())
      .filter(Boolean);
    const fromStandalone = customBriefCategories.map((c) => c.trim()).filter(Boolean);
    const unique = Array.from(
      new Set([...fromSources, ...fromOverrides, ...fromStandalone]),
    );
    const base = BRIEF_CATEGORIES.filter((c) => c !== "Web3");
    return [...base, ...unique.filter((c) => !base.includes(c))];
  }, [briefSourceOverrides, customBriefCategories, customSources]);

  const filteredArticles = useMemo(
    () =>
      sortByPriorityKeywords(
        filterArticles(articles, preferences, availableSources, briefSourceOverrides),
        preferences.priorityKeywords,
      ),
    [articles, briefSourceOverrides, preferences, availableSources],
  );
  const visibleArticles = filteredArticles.slice(0, visibleArticleCount);
  const hasMoreArticles = visibleArticles.length < filteredArticles.length;
  const categoryCounts = useMemo(
    () =>
      getCategoryCounts(
        articles,
        preferences,
        availableSources,
        dynamicBriefCategories,
        briefSourceOverrides,
      ),
    [articles, briefSourceOverrides, dynamicBriefCategories, preferences, availableSources],
  );

  function handleAddBriefCategory() {
    const trimmed = newBriefCategoryName.trim();
    if (!trimmed) return;
    setCustomBriefCategories(addCustomBriefCategory(trimmed));
    setNewBriefCategoryName("");
  }

  function handleRemoveBriefCategory(name: string) {
    setCustomBriefCategories(removeCustomBriefCategory(name));
  }

  function handleAssignBriefSourceCategory(sourceId: string, category: string) {
    setBriefSourceCategoryOverride(sourceId, category || null);
    setBriefSourceOverrides(readBriefSourceCategoryOverrides());
  }
  const liveIssues = getLiveIssueArticles(articles);

  function setCategory(category: string) {
    setPreferences({ ...preferences, category });
    setVisibleArticleCount(INITIAL_VISIBLE_ARTICLES);
  }

  function setSource(source: string) {
    setPreferences({
      ...preferences,
      sources: source === "All" ? availableSources : [source],
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
    window.location.assign(`/community/write?articleSlug=${encodeURIComponent(article.slug)}`);
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
    <section className="border-t border-tint/10 bg-background/72">
      <Container className="min-w-0 pb-10 pt-4 sm:pb-12 sm:pt-5 lg:pb-16">
        <div className="mb-5 grid min-w-0 gap-4 border-b border-tint/10 pb-5 sm:mb-6">
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
        </div>

        <LiveIssueBar
          articles={liveIssues}
          isLoading={isLoading}
          label={preferences.language === "ko" ? "실시간 금융 속보" : "Live Market News"}
        />

        <div className="mt-6 min-w-0">
          {pendingArticles ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2">
              <span className="text-xs font-semibold text-accent-ink">
                {copy.feed.newBriefsReady}
              </span>
              <button
                className="text-xs font-bold text-accent transition hover:text-accent-ink"
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
          categories={dynamicBriefCategories}
          counts={categoryCounts}
          language={preferences.language}
          onChange={setCategory}
        />

        {preferences.category === "Stock Market" && (
          <StockMarketFilters preferences={preferences} onChange={setPreferences} />
        )}

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
              <div className="overflow-hidden rounded-lg border border-tint/10 bg-surface/78">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-tint/10 px-3 py-3 sm:px-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {copy.feed.mainFeed}
                  </p>
                  <span className="shrink-0 text-xs font-medium text-muted-2">
                    {copy.feed.briefCount(filteredArticles.length)}
                  </span>
                </div>
                <div className="divide-y divide-tint/10">
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
                  <div className="border-t border-tint/10 p-3 sm:p-4">
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
            sources={availableSources}
            lastUpdatedAt={lastUpdatedAt}
            onSourceChange={setSource}
            articles={articles}
            customBriefCategories={customBriefCategories}
            briefSourceOverrides={briefSourceOverrides}
            dynamicBriefCategories={dynamicBriefCategories}
            newBriefCategoryName={newBriefCategoryName}
            onNewBriefCategoryNameChange={setNewBriefCategoryName}
            onAddBriefCategory={handleAddBriefCategory}
            onRemoveBriefCategory={handleRemoveBriefCategory}
            onAssignBriefSourceCategory={handleAssignBriefSourceCategory}
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-ink">
            {label}
          </p>
        </div>

        <div className="live-issues-mask overflow-hidden">
          {isLoading ? (
            <div className="flex gap-3">
              {[0, 1, 2].map((item) => (
                <span
                  className="h-7 min-w-64 animate-pulse rounded-full bg-tint/10"
                  key={item}
                />
              ))}
            </div>
          ) : (
            <div className="live-issues-track flex gap-3 will-change-transform">
              {tickerArticles.map((article, index) => (
                <a
                className="flex min-w-[15rem] max-w-[85vw] items-center gap-2 rounded-full border border-tint/15 bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:border-accent/50 hover:text-accent-ink sm:min-w-[18rem] sm:max-w-sm"
                  href={article.originalUrl}
                  key={`${article.id}-${index}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-accent-ink">
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

const SLOW_OFFICIAL_SOURCE_IDS = new Set(["bok-press", "molit-press"]);
const LIVE_MARKET_CATEGORIES = new Set(["국내증시", "Macro", "부동산", "가상자산"]);
const LIVE_MARKET_TAGS = [
  "BTC",
  "ETH",
  "NASDAQ",
  "FED",
  "NVIDIA",
  "KOSPI",
  "KOSDAQ",
  "Real Estate",
  "ETF",
];

function getLiveIssueArticles(articles: Article[]) {
  const recentCutoff = Date.now() - 72 * 60 * 60 * 1000;
  const liveCandidates = articles
    .filter((article) => !SLOW_OFFICIAL_SOURCE_IDS.has(article.sourceId))
    .filter((article) => {
      const publishedAt = new Date(article.publishedAt).getTime();
      return Number.isNaN(publishedAt) || publishedAt >= recentCutoff;
    })
    .filter((article) => {
      const hasLiveCategory = LIVE_MARKET_CATEGORIES.has(article.category);
      const hasMarketTag = article.tags.some((tag) => LIVE_MARKET_TAGS.includes(tag));
      return hasLiveCategory || hasMarketTag || article.marketImpact !== "Neutral";
    })
    .sort((a, b) => {
      const impactScore = getLiveImpactScore(b) - getLiveImpactScore(a);
      if (impactScore !== 0) return impactScore;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  return (liveCandidates.length > 0 ? liveCandidates : articles).slice(0, 5);
}

function getLiveImpactScore(article: Article) {
  if (article.marketImpact === "Bullish" || article.marketImpact === "Bearish") {
    return 2;
  }

  return article.tags.some((tag) => LIVE_MARKET_TAGS.includes(tag)) ? 1 : 0;
}

function CategoryTabs({
  activeCategory,
  categories,
  counts,
  language,
  onChange,
}: {
  activeCategory: string;
  categories: string[];
  counts: Record<string, number>;
  language: BriefPreferences["language"];
  onChange: (category: string) => void;
}) {
  return (
    <div className="mt-5 max-w-full overflow-x-auto overscroll-x-contain border-b border-tint/10 [-webkit-overflow-scrolling:touch]">
      <div className="flex w-max min-w-full gap-1">
        {categories.map((category) => (
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
            {getBriefCategoryLabel(category, language)} ({counts[category] ?? 0})
          </button>
        ))}
      </div>
    </div>
  );
}

function getBriefCategoryLabel(category: string, language: BriefPreferences["language"]) {
  const koLabels: Record<string, string> = {
    All: "전체",
    "국내증시": "국내증시",
    Macro: "매크로",
    "부동산": "부동산",
    "가상자산": "가상자산",
  };
  const enLabels: Record<string, string> = {
    All: "All",
    "국내증시": "Korean Stocks",
    Macro: "Macro",
    "부동산": "Real Estate",
    "가상자산": "Crypto",
  };

  return (language === "ko" ? koLabels : enLabels)[category] ?? getCategoryLabel(category, language);
}

function StockMarketFilters({
  preferences,
  onChange,
}: {
  preferences: BriefPreferences;
  onChange: (preferences: BriefPreferences) => void;
}) {
  function toggleRegion(region: string) {
    const nextRegions = preferences.stockRegions.includes(region)
      ? preferences.stockRegions.filter((item) => item !== region)
      : [...preferences.stockRegions, region];

    onChange({
      ...preferences,
      stockRegions: nextRegions.length > 0 ? nextRegions : [region],
    });
  }

  function toggleType(type: string) {
    const nextTypes = preferences.stockTypes.includes(type)
      ? preferences.stockTypes.filter((item) => item !== type)
      : [...preferences.stockTypes, type];

    onChange({
      ...preferences,
      stockTypes: nextTypes.length > 0 ? nextTypes : [type],
    });
  }

  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-tint/10 bg-surface/60 p-3 lg:grid-cols-2">
      <FilterButtonGroup
        activeItems={preferences.stockRegions}
        allItems={STOCK_REGIONS}
        label="Region"
        onToggle={toggleRegion}
      />
      <FilterButtonGroup
        activeItems={preferences.stockTypes}
        allItems={STOCK_TYPES}
        label="Type"
        onToggle={toggleType}
      />
    </div>
  );
}

function FilterButtonGroup({
  activeItems,
  allItems,
  label,
  onToggle,
}: {
  activeItems: string[];
  allItems: readonly string[];
  label: string;
  onToggle: (item: string) => void;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {allItems.map((item) => {
          const isActive = activeItems.includes(item);

          return (
            <button
              aria-pressed={isActive}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                isActive
                  ? "border-accent/60 bg-accent/20 text-accent-ink"
                  : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/50 hover:text-ink",
              )}
              key={item}
              onClick={() => onToggle(item)}
              type="button"
            >
              {item}
            </button>
          );
        })}
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

function readMergedArticleSentiment(article: Article): ArticleSentiment {
  const local = readArticleSentiment(article.slug);
  return {
    ...local,
    bull: Math.max(local.bull, article.bullCount ?? 0),
    bear: Math.max(local.bear, article.bearCount ?? 0),
  };
}

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
  const [sentiment, setSentiment] = useState<ArticleSentiment>(() =>
    readMergedArticleSentiment(article),
  );
  const [opinionOpen, setOpinionOpen] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<ArticleReaction | null>(null);
  const [opinion, setOpinion] = useState("");

  useEffect(() => {
    function syncSentiment() {
      setSentiment(readMergedArticleSentiment(article));
    }

    syncSentiment();
    window.addEventListener("storage", syncSentiment);
    window.addEventListener(ARTICLE_SENTIMENT_CHANGED_EVENT, syncSentiment);

    return () => {
      window.removeEventListener("storage", syncSentiment);
      window.removeEventListener(ARTICLE_SENTIMENT_CHANGED_EVENT, syncSentiment);
    };
  }, [article]);

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

  function handleReaction(reaction: ArticleReaction) {
    const nextSentiment = reactToArticle(article, reaction, {
      author: readAuthorName() || "You",
    });
    void persistArticleReaction(article.id, reaction);
    setSentiment(nextSentiment);
    setSelectedReaction(reaction);
    setOpinionOpen(true);
  }

  function submitOpinion() {
    if (!selectedReaction || !opinion.trim()) {
      setOpinionOpen(false);
      return;
    }

    const nextSentiment = reactToArticle(article, selectedReaction, {
      author: readAuthorName() || "You",
      opinion,
    });
    setSentiment(nextSentiment);
    setOpinion("");
    setOpinionOpen(false);
  }

  const showKo = translation.status === "success" && translation.isShowingTranslation;
  const displayTitle = showKo && translation.translatedHeadline
    ? translation.translatedHeadline
    : article.title;

  return (
    <article className="group grid min-w-0 gap-3 px-3 py-3 transition hover:bg-tint/[0.03] sm:grid-cols-[4.5rem_1fr] sm:px-4">
      <time
        className="text-xs font-semibold tabular-nums text-muted-2"
        dateTime={article.publishedAt}
        title={formatLocalDateTime(article.publishedAt, language)}
      >
        {formatRelativeTime(article.publishedAt, language)}
      </time>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded bg-accent/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-accent-ink">
            {article.sourceName}
          </span>
          <Badge tone="muted">{getCategoryLabel(article.category, language)}</Badge>
          <span className={cn("rounded px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]", getMarketImpactClass(article.marketImpact))}>
            {article.marketImpact ?? "Neutral"}
          </span>
          <span className="text-xs font-medium text-muted-2">
            {formatShortDate(article.publishedAt, language)}
          </span>
          <span className="text-xs font-medium text-muted-2">
            {article.readingTime}
          </span>
        </div>

        <a href={article.originalUrl} rel="noreferrer" target="_blank">
          <h2
            className="mt-2 break-words text-base font-semibold leading-snug text-ink transition group-hover:text-accent-ink sm:text-lg"
            key={showKo ? "ko" : "en"}
          >
            <span className={showKo ? "brief-fade-in" : undefined}>{displayTitle}</span>
          </h2>
        </a>

        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
          <div className="rounded-md border border-accent/25 bg-accent-soft/25 p-3">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-accent-ink">
              AI Brief
            </p>
            <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-ink">
              {article.briefSummary}
            </p>
          </div>
          {article.imageUrl ? (
            <a
              className="block overflow-hidden rounded-md border border-tint/10 bg-tint/[0.03]"
              href={article.originalUrl}
              rel="noreferrer"
              target="_blank"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="h-28 w-full object-cover transition group-hover:scale-[1.02]"
                loading="lazy"
                src={article.imageUrl}
              />
            </a>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            className="text-sm font-semibold text-accent transition hover:text-accent-ink"
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
            className="inline-flex h-7 items-center justify-center rounded-full border border-tint/10 bg-tint/[0.03] px-3 text-xs font-bold text-muted transition hover:border-accent/50 hover:text-ink"
            onClick={onQuote}
            type="button"
            title={copy.feed.quoteToCommunity}
          >
            {copy.feed.discuss}
          </button>
          <TranslateButton language={language} state={translation} onClick={handleTranslate} />
        </div>

        <ArticleSentimentBar
          language={language}
          onReact={handleReaction}
          sentiment={sentiment}
        />

        {opinionOpen ? (
          <div className="mt-3 rounded-lg border border-tint/10 bg-tint/[0.03] p-3">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
              {language === "ko" ? "Short opinion" : "Short opinion"}
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                className="min-h-10 flex-1 rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/25"
                maxLength={180}
                onChange={(event) => setOpinion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitOpinion();
                  }
                }}
                placeholder={
                  selectedReaction === "Bearish"
                    ? "Why is this bearish?"
                    : "Why is this bullish?"
                }
                value={opinion}
              />
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  className="h-10 rounded-md border border-accent/40 bg-accent/15 px-3 text-xs font-bold text-accent-ink transition hover:bg-accent/20"
                  onClick={submitOpinion}
                  type="button"
                >
                  Post
                </button>
                <button
                  className="h-10 rounded-md border border-tint/10 px-3 text-xs font-bold text-muted transition hover:text-ink"
                  onClick={() => {
                    setOpinionOpen(false);
                    setOpinion("");
                  }}
                  type="button"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {translation.status === "error" ? (
          <p className="mt-1.5 text-xs text-rose-300">
            {language === "ko"
              ? "번역을 불러오지 못했어요."
              : "Translation could not be loaded."}
          </p>
        ) : null}

        {expanded ? (
          <div className="mt-3 rounded-md border border-tint/10 bg-background/70 p-3">
            {showKo && translation.translatedBody ? (
              <p key="body-ko" className="brief-fade-in break-words text-sm leading-6 text-ink">
                {translation.translatedBody}
              </p>
            ) : (
              <>
                <p className="break-words text-sm leading-6 text-ink">
                  {article.briefSummary || formatBriefSummary(article, language)}
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-muted">{article.excerpt}</p>
              </>
            )}
            {article.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    className="rounded-full border border-tint/10 bg-tint/[0.03] px-2.5 py-1 text-xs font-medium text-muted"
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

function ArticleSentimentBar({
  sentiment,
  language,
  onReact,
}: {
  sentiment: ArticleSentiment;
  language: BriefPreferences["language"];
  onReact: (reaction: ArticleReaction) => void;
}) {
  const total = sentiment.bull + sentiment.bear;
  const bullShare = total > 0 ? Math.round((sentiment.bull / total) * 100) : 50;
  const bearShare = total > 0 ? 100 - bullShare : 50;

  return (
    <div className="mt-3 rounded-lg border border-tint/10 bg-background/55 p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <button
          aria-pressed={sentiment.userReaction === "Bullish"}
          className={cn(
            "min-h-10 rounded-md border px-3 text-left transition",
            sentiment.userReaction === "Bullish"
              ? "border-emerald-400/50 bg-emerald-400/12 text-emerald-200"
              : "border-tint/10 bg-tint/[0.03] text-muted hover:border-emerald-400/40 hover:text-emerald-200",
          )}
          onClick={() => onReact("Bullish")}
          type="button"
        >
          <span className="block text-sm font-bold">{language === "ko" ? "Bull" : "Bull"}</span>
          <span className="text-xs">{sentiment.bull} votes</span>
        </button>
        <button
          aria-pressed={sentiment.userReaction === "Bearish"}
          className={cn(
            "min-h-10 rounded-md border px-3 text-left transition",
            sentiment.userReaction === "Bearish"
              ? "border-rose-400/50 bg-rose-400/12 text-rose-200"
              : "border-tint/10 bg-tint/[0.03] text-muted hover:border-rose-400/40 hover:text-rose-200",
          )}
          onClick={() => onReact("Bearish")}
          type="button"
        >
          <span className="block text-sm font-bold">{language === "ko" ? "Bear" : "Bear"}</span>
          <span className="text-xs">{sentiment.bear} votes</span>
        </button>
      </div>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-tint/10">
        <span className="bg-emerald-400/80" style={{ width: `${bullShare}%` }} />
        <span className="bg-rose-400/80" style={{ width: `${bearShare}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[0.7rem] font-semibold text-muted-2">
        <span>Bull {sentiment.bull}</span>
        <span>{total} reactions</span>
        <span>Bear {sentiment.bear}</span>
      </div>
    </div>
  );
}

function getMarketImpactClass(impact: Article["marketImpact"]) {
  if (impact === "Bullish") {
    return "bg-emerald-400/12 text-emerald-200";
  }

  if (impact === "Bearish") {
    return "bg-rose-400/12 text-rose-200";
  }

  return "bg-tint/[0.06] text-muted";
}

function getBriefVisitorId() {
  if (typeof window === "undefined") {
    return "server";
  }

  const key = "chain-brief-visitor-id";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, next);
  return next;
}

async function persistArticleReaction(articleId: string, reaction: ArticleReaction) {
  try {
    await fetch("/api/briefs/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId,
        reaction: reaction === "Bearish" ? "bear" : "bull",
        visitorId: getBriefVisitorId(),
      }),
    });
  } catch {
    // Local reaction state still gives instant feedback if persistence is unavailable.
  }
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
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-tint/10 bg-tint/[0.03] px-3 text-xs font-bold text-muted transition hover:border-accent/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
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

function FeedSidebar({
  articleCount,
  lastUpdatedAt,
  onSourceChange,
  preferences,
  sources,
  articles,
  customBriefCategories,
  briefSourceOverrides,
  dynamicBriefCategories,
  newBriefCategoryName,
  onNewBriefCategoryNameChange,
  onAddBriefCategory,
  onRemoveBriefCategory,
  onAssignBriefSourceCategory,
}: {
  articleCount: number;
  lastUpdatedAt: string | null;
  onSourceChange: (source: string) => void;
  preferences: BriefPreferences;
  sources: string[];
  articles: Article[];
  customBriefCategories: string[];
  briefSourceOverrides: BriefSourceCategoryOverrides;
  dynamicBriefCategories: string[];
  newBriefCategoryName: string;
  onNewBriefCategoryNameChange: (value: string) => void;
  onAddBriefCategory: () => void;
  onRemoveBriefCategory: (name: string) => void;
  onAssignBriefSourceCategory: (sourceId: string, category: string) => void;
}) {
  const { t: copy } = useI18n(preferences.language);
  const language = preferences.language;
  const sourceList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; defaultCategory: string }>();
    for (const article of articles) {
      if (!map.has(article.sourceId)) {
        map.set(article.sourceId, {
          id: article.sourceId,
          name: article.sourceName,
          defaultCategory: article.customCategory ?? article.category,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [articles]);
  const allSourcesSelected = sources.every((source) =>
    preferences.sources.includes(source),
  ) || ACTIVE_SOURCES.every((source) => preferences.sources.includes(source));

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
                ? "border-accent/60 bg-accent/20 text-accent-ink"
                : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/50 hover:text-ink",
            )}
            onClick={() => onSourceChange("All")}
            type="button"
          >
            {getCategoryLabel("All", preferences.language)}
          </button>
          {sources.map((source) => (
            <button
              aria-pressed={!allSourcesSelected && preferences.sources.includes(source)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                !allSourcesSelected && preferences.sources.includes(source)
                  ? "border-accent/60 bg-accent/20 text-accent-ink"
                  : "border-tint/10 bg-tint/[0.03] text-muted hover:border-accent/50 hover:text-ink",
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
        </dl>
        <Button className="mt-4 w-full" href="/settings" variant="secondary">
          {copy.feed.customizeFeed}
        </Button>
      </Card>

      <Card className="min-w-0 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {language === "ko" ? "카테고리" : "Categories"}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          {language === "ko"
            ? "직접 카테고리를 추가해 브리프 소스를 분류해 보세요."
            : "Add your own categories to group brief sources."}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className="min-h-9 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
            maxLength={40}
            onChange={(event) => onNewBriefCategoryNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddBriefCategory();
              }
            }}
            placeholder={language === "ko" ? "예: 국내 매크로" : "e.g. Korea Macro"}
            value={newBriefCategoryName}
          />
          <button
            className="shrink-0 rounded-md border border-accent/50 bg-accent/15 px-3 text-xs font-bold text-accent-ink transition hover:bg-accent/25 disabled:opacity-50"
            disabled={!newBriefCategoryName.trim()}
            onClick={onAddBriefCategory}
            type="button"
          >
            +
          </button>
        </div>
        {customBriefCategories.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {customBriefCategories.map((name) => (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-tint/10 bg-tint/[0.04] px-2.5 py-1 text-xs font-semibold text-muted"
                key={name}
              >
                {name}
                <button
                  aria-label={language === "ko" ? `${name} 삭제` : `Remove ${name}`}
                  className="ml-1 text-muted-2 transition hover:text-ink"
                  onClick={() => onRemoveBriefCategory(name)}
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </Card>

      {sourceList.length > 0 ? (
        <Card className="min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {language === "ko" ? "소스 분류" : "Group sources"}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            {language === "ko"
              ? "각 소스를 원하는 카테고리로 옮길 수 있어요."
              : "Reassign any source to a category you choose."}
          </p>
          <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1">
            {sourceList.map((source) => {
              const current = briefSourceOverrides[source.id] ?? "";
              return (
                <div
                  className="flex min-w-0 items-center gap-2 rounded-md border border-tint/10 bg-tint/[0.03] px-2.5 py-1.5"
                  key={source.id}
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
                    {source.name}
                  </span>
                  <select
                    className="max-w-[8.5rem] rounded-md border border-tint/10 bg-background px-2 py-1 text-xs font-semibold text-ink outline-none transition focus:border-accent"
                    onChange={(event) =>
                      onAssignBriefSourceCategory(source.id, event.target.value)
                    }
                    value={current}
                  >
                    <option value="">
                      {language === "ko"
                        ? `기본 (${source.defaultCategory})`
                        : `Default (${source.defaultCategory})`}
                    </option>
                    {dynamicBriefCategories
                      .filter((c) => c !== "All")
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

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
    <div className="overflow-hidden rounded-lg border border-tint/10 bg-surface/78">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          className="grid animate-pulse gap-3 border-b border-tint/10 px-4 py-4 last:border-b-0 sm:grid-cols-[4.5rem_1fr]"
          key={item}
        >
          <div className="h-4 w-12 rounded bg-tint/10" />
          <div>
            <div className="flex gap-2">
              <div className="h-5 w-24 rounded bg-tint/10" />
              <div className="h-5 w-20 rounded bg-tint/10" />
            </div>
            <div className="mt-4 h-5 w-4/5 rounded bg-tint/10" />
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

function filterArticles(
  articles: Article[],
  preferences: BriefPreferences,
  availableSources: string[],
  overrides: BriefSourceCategoryOverrides = {},
) {
  return filterArticlesWithOptions(articles, preferences, availableSources, overrides, {
    includeCategory: true,
  });
}

function hasNewArticles(currentArticles: Article[], nextArticles: Article[]) {
  const currentIds = new Set(currentArticles.map((article) => article.id));

  return nextArticles.some((article) => !currentIds.has(article.id));
}

function getCategoryCounts(
  articles: Article[],
  preferences: BriefPreferences,
  availableSources: string[],
  categories: string[],
  overrides: BriefSourceCategoryOverrides = {},
) {
  const baseMatches = filterArticlesWithOptions(
    articles,
    preferences,
    availableSources,
    overrides,
    {
      includeCategory: false,
    },
  );
  const counts = Object.fromEntries(categories.map((c) => [c, 0])) as Record<string, number>;

  counts.All = baseMatches.length;

  for (const article of baseMatches) {
    const override = overrides[article.sourceId]?.trim();
    for (const category of categories) {
      if (
        category !== "All" &&
        (article.category === category ||
          article.tags.includes(category) ||
          article.customCategory === category ||
          (override && override === category))
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
  availableSources: string[],
  overrides: BriefSourceCategoryOverrides,
  options: { includeCategory: boolean },
) {
  const includeKeywords = parseKeywords(preferences.includeKeywords);
  const excludeKeywords = parseKeywords(preferences.excludeKeywords);
  const dateFromMs = preferences.dateFrom
    ? new Date(`${preferences.dateFrom}T00:00:00`).getTime()
    : null;
  const dateToMs = preferences.dateTo
    ? new Date(`${preferences.dateTo}T23:59:59.999`).getTime()
    : null;

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

    const allSourcesSelected = availableSources.every((source) =>
      preferences.sources.includes(source),
    );
    const baseSourcesSelected = ACTIVE_SOURCES.every((source) =>
      preferences.sources.includes(source),
    );
    const sourceMatches =
      allSourcesSelected ||
      baseSourcesSelected ||
      preferences.sources.includes(article.sourceName) ||
      article.sourceId.startsWith("custom-brief-");
    const override = overrides[article.sourceId]?.trim();
    const categoryMatches =
      !options.includeCategory ||
      preferences.category === "All" ||
      article.category === preferences.category ||
      article.tags.includes(preferences.category) ||
      article.customCategory === preferences.category ||
      (override !== undefined && override === preferences.category);
    const stockRegionMatches =
      article.feedCategory !== "Stock Market" ||
      !article.region ||
      preferences.stockRegions.includes(article.region);
    const stockTypeMatches =
      article.feedCategory !== "Stock Market" ||
      !article.marketType ||
      preferences.stockTypes.includes(article.marketType);
    const includesRequired =
      includeKeywords.length === 0 ||
      includeKeywords.some((keyword) => searchableText.includes(keyword));
    const excludesBlocked = excludeKeywords.some((keyword) =>
      searchableText.includes(keyword),
    );
    let dateMatches = true;
    if (dateFromMs !== null || dateToMs !== null) {
      const publishedAtMs = new Date(article.publishedAt).getTime();
      if (Number.isNaN(publishedAtMs)) {
        dateMatches = false;
      } else {
        if (dateFromMs !== null && publishedAtMs < dateFromMs) dateMatches = false;
        if (dateToMs !== null && publishedAtMs > dateToMs) dateMatches = false;
      }
    }

    return (
      sourceMatches &&
      categoryMatches &&
      stockRegionMatches &&
      stockTypeMatches &&
      includesRequired &&
      !excludesBlocked &&
      dateMatches
    );
  });
}

function sortByPriorityKeywords(articles: Article[], priorityKeywords: string[]) {
  const keywords = priorityKeywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);

  if (keywords.length === 0) return articles;

  const scored = articles.map((article, index) => {
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

    const score = keywords.reduce(
      (total, keyword) => (searchableText.includes(keyword) ? total + 1 : total),
      0,
    );

    return { article, index, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored.map((entry) => entry.article);
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

function getWaitingLabel(language: BriefPreferences["language"]) {
  return language === "ko" ? "첫 새로고침 대기 중" : "Waiting for first refresh";
}

