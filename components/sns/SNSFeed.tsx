"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryTabs } from "@/components/sns/CategoryTabs";
import { SNSCard } from "@/components/sns/SNSCard";
import { SourceBadge } from "@/components/sns/SourceBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  readCustomRssSources,
  type CustomRssSource,
} from "@/lib/custom-rss-sources";
import { formatShortTime } from "@/lib/i18n";
import { snsSources, SNS_CATEGORIES } from "@/lib/sns/sources";
import type { SnsCategory, SnsVideo } from "@/lib/sns/types";
import { useI18n } from "@/lib/i18n/use-i18n";

type SnsResponse = {
  videos: SnsVideo[];
  count: number;
  refreshedAt: string;
  error?: string;
};

type SnsCopy = {
  allSources: string;
  customSources: string;
  emptyDescription: string;
  emptyTitle: string;
  errorMessage: string;
  errorTitle: string;
  futureIntegrations: string;
  headline: string;
  lastUpdated: (value: string) => string;
  noMatchesDescription: string;
  noMatchesTitle: string;
  refreshWaiting: string;
  researchFeed: string;
  searchLabel: string;
  searchPlaceholder: string;
  sectionLabel: string;
  showMore: string;
  sources: string;
  subtitle: string;
  videoCount: (count: number) => string;
};

const ALL_SOURCES = "All";
const INITIAL_VISIBLE_VIDEOS = 6;
const VISIBLE_VIDEO_STEP = 6;

function getSnsCopy(language: "ko" | "en"): SnsCopy {
  if (language === "ko") {
    return {
      allSources: "전체",
      customSources: "커스텀 RSS",
      emptyDescription: "현재 활성화된 RSS 소스에서 불러온 콘텐츠가 아직 없습니다.",
      emptyTitle: "표시할 SNS/RSS 콘텐츠가 없습니다.",
      errorMessage: "지금은 SNS/RSS 피드를 불러오지 못하고 있어요.",
      errorTitle: "SNS/RSS 피드를 불러오지 못했어요.",
      futureIntegrations: "추가 예정 채널",
      headline: "크리에이터 리서치 피드",
      lastUpdated: (value: string) => `마지막 업데이트 ${value}`,
      noMatchesDescription: "카테고리, 소스, 검색어를 조금 더 넓게 잡아보세요.",
      noMatchesTitle: "현재 필터와 일치하는 콘텐츠가 없습니다.",
      refreshWaiting: "첫 새로고침을 기다리는 중",
      researchFeed: "리서치 피드",
      searchLabel: "SNS/RSS 피드 검색",
      searchPlaceholder: "ETF, restaking, Solana, security...",
      sectionLabel: "SNS",
      showMore: "더 보기",
      sources: "소스",
      subtitle:
        "유튜브 리서치와 직접 추가한 RSS 피드를 한곳에서 빠르게 훑어보세요.",
      videoCount: (count: number) => `${count}개 항목`,
    };
  }

  return {
    allSources: "All",
    customSources: "Custom RSS",
    emptyDescription: "The active RSS sources have not returned any content yet.",
    emptyTitle: "No SNS/RSS content available.",
    errorMessage: "SNS/RSS feeds could not be loaded right now.",
    errorTitle: "SNS/RSS fetching failed.",
    futureIntegrations: "Future Integrations",
    headline: "Market research from creator feeds.",
    lastUpdated: (value: string) => `Last updated ${value}`,
    noMatchesDescription: "Try a broader category, source selection, or search query.",
    noMatchesTitle: "No content matches the current filters.",
    refreshWaiting: "Waiting for first refresh",
    researchFeed: "Research Feed",
    searchLabel: "Search SNS/RSS Feed",
    searchPlaceholder: "ETF, restaking, Solana, security...",
    sectionLabel: "SNS",
    showMore: "Show more",
    sources: "Sources",
    subtitle:
      "Scan YouTube research and your own RSS sources in one compact feed.",
    videoCount: (count: number) => `${count} items`,
  };
}

export function SNSFeed() {
  const { language } = useI18n();
  const copy = getSnsCopy(language);
  const [videos, setVideos] = useState<SnsVideo[]>([]);
  const [customSources, setCustomSources] = useState<CustomRssSource[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [visibleVideoCount, setVisibleVideoCount] = useState(INITIAL_VISIBLE_VIDEOS);

  const enabledCustomSources = useMemo(
    () =>
      customSources.filter(
        (source) =>
          source.enabled &&
          (source.type === "youtube" ||
            source.category === "SNS" ||
            SNS_CATEGORIES.includes(source.category as SnsCategory)),
      ),
    [customSources],
  );
  const sourceNames = useMemo(
    () => [
      ...snsSources.map((source) => source.name),
      ...enabledCustomSources.map((source) => source.name),
    ],
    [enabledCustomSources],
  );

  useEffect(() => {
    function loadCustomSources() {
      setCustomSources(readCustomRssSources());
    }

    loadCustomSources();
    window.addEventListener("chain-brief-custom-rss-sources-changed", loadCustomSources);
    window.addEventListener("storage", loadCustomSources);

    return () => {
      window.removeEventListener(
        "chain-brief-custom-rss-sources-changed",
        loadCustomSources,
      );
      window.removeEventListener("storage", loadCustomSources);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSnsVideos() {
      try {
        setIsLoading(true);
        setError(null);

        const [defaultResult, customResult] = await Promise.allSettled([
          fetchDefaultSnsVideos(),
          fetchCustomRssVideos(enabledCustomSources),
        ]);
        const defaultVideos =
          defaultResult.status === "fulfilled" ? defaultResult.value.videos : [];
        const customVideos =
          customResult.status === "fulfilled" ? customResult.value.videos : [];
        const nextVideos = [...defaultVideos, ...customVideos].sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        );

        if (isMounted) {
          setVideos(nextVideos);
          setLastUpdatedAt(new Date().toISOString());
          if (
            nextVideos.length === 0 &&
            defaultResult.status === "rejected" &&
            customResult.status === "rejected"
          ) {
            setError(copy.errorMessage);
          }
        }
      } catch {
        if (isMounted) {
          setError(copy.errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSnsVideos();

    return () => {
      isMounted = false;
    };
  }, [copy.errorMessage, enabledCustomSources]);

  const effectiveActiveSources = activeSources.length > 0 ? activeSources : sourceNames;

  const dynamicCategories = useMemo(() => {
    const custom = enabledCustomSources
      .map((s) => s.category?.trim())
      .filter((c): c is string => Boolean(c));
    const unique = Array.from(new Set(custom));
    const base = SNS_CATEGORIES as string[];
    return [...base, ...unique.filter((c) => !base.includes(c))];
  }, [enabledCustomSources]);

  const filteredVideos = useMemo(
    () => filterVideos(videos, activeCategory, effectiveActiveSources, searchQuery),
    [activeCategory, effectiveActiveSources, searchQuery, videos],
  );
  const visibleVideos = filteredVideos.slice(0, visibleVideoCount);
  const hasMoreVideos = visibleVideos.length < filteredVideos.length;
  const categoryCounts = useMemo(
    () => getCategoryCounts(videos, dynamicCategories, effectiveActiveSources, searchQuery),
    [dynamicCategories, effectiveActiveSources, searchQuery, videos],
  );

  function toggleSource(sourceName: string) {
    if (sourceName === ALL_SOURCES) {
      setActiveSources([]);
      setVisibleVideoCount(INITIAL_VISIBLE_VIDEOS);
      return;
    }

    setActiveSources((current) => {
      const base = current.length > 0 ? current : sourceNames;
      const next = base.includes(sourceName)
        ? base.filter((source) => source !== sourceName)
        : [...base, sourceName];

      return next.length === sourceNames.length ? [] : next;
    });
    setVisibleVideoCount(INITIAL_VISIBLE_VIDEOS);
  }

  function handleCategoryChange(category: string) {
    setActiveCategory(category);
    setVisibleVideoCount(INITIAL_VISIBLE_VIDEOS);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setVisibleVideoCount(INITIAL_VISIBLE_VIDEOS);
  }

  function showMoreVideos() {
    setVisibleVideoCount((current) => current + VISIBLE_VIDEO_STEP);
  }

  const allSourcesSelected = activeSources.length === 0;

  return (
    <section className="border-t border-tint/10 bg-background/72">
      <Container className="min-w-0 pb-10 pt-4 sm:pb-12 sm:pt-5 lg:pb-16">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {copy.sectionLabel}
            </p>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {copy.headline}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {copy.subtitle}
            </p>
            <p className="mt-2 text-xs font-medium text-muted-2">
              {lastUpdatedAt
                ? copy.lastUpdated(formatShortTime(lastUpdatedAt, language))
                : copy.refreshWaiting}
            </p>
          </div>
        </div>

        <CategoryTabs
          activeCategory={activeCategory}
          categories={dynamicCategories}
          counts={categoryCounts}
          language={language}
          onChange={handleCategoryChange}
        />

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <div className="mb-4 min-w-0 rounded-lg border border-tint/10 bg-surface/78 p-3 sm:p-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {copy.searchLabel}
                </span>
                <input
                  className="mt-2 min-h-11 w-full rounded-md border border-tint/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  value={searchQuery}
                />
              </label>
            </div>

            {isLoading ? <LoadingState /> : null}
            {!isLoading && error ? (
              <ErrorState message={error} title={copy.errorTitle} />
            ) : null}
            {!isLoading && !error && videos.length === 0 ? (
              <EmptyState
                description={copy.emptyDescription}
                title={copy.emptyTitle}
              />
            ) : null}
            {!isLoading && !error && videos.length > 0 && filteredVideos.length === 0 ? (
              <NoMatchesState
                description={copy.noMatchesDescription}
                title={copy.noMatchesTitle}
              />
            ) : null}

            {!isLoading && !error && filteredVideos.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-tint/10 bg-surface/78">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-tint/10 px-3 py-3 sm:px-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {copy.researchFeed}
                  </p>
                  <span className="shrink-0 text-xs font-medium text-muted-2">
                    {copy.videoCount(filteredVideos.length)}
                  </span>
                </div>
                <div className="divide-y divide-tint/10">
                  {visibleVideos.map((video) => (
                    <SNSCard key={video.id} language={language} video={video} />
                  ))}
                </div>
                {hasMoreVideos ? (
                  <div className="border-t border-tint/10 p-3 sm:p-4">
                    <Button
                      className="w-full"
                      onClick={showMoreVideos}
                      type="button"
                      variant="secondary"
                    >
                      {copy.showMore}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <Card className="min-w-0 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {copy.sources}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <SourceBadge
                  active={allSourcesSelected}
                  onClick={() => toggleSource(ALL_SOURCES)}
                >
                  {copy.allSources}
                </SourceBadge>
                {snsSources.map((source) => (
                  <SourceBadge
                    active={allSourcesSelected || activeSources.includes(source.name)}
                    key={source.id}
                    onClick={() => toggleSource(source.name)}
                  >
                    {source.name}
                  </SourceBadge>
                ))}
                {enabledCustomSources.map((source) => (
                  <SourceBadge
                    active={allSourcesSelected || activeSources.includes(source.name)}
                    key={source.id}
                    onClick={() => toggleSource(source.name)}
                  >
                    {source.name}
                  </SourceBadge>
                ))}
              </div>
            </Card>

            <Card className="min-w-0 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {copy.customSources}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">
                {enabledCustomSources.length} / {customSources.length}
              </p>
              <Button className="mt-4 w-full" href="/settings" variant="secondary">
                {language === "ko" ? "소스 관리" : "Manage sources"}
              </Button>
            </Card>

            <Card className="min-w-0 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {copy.futureIntegrations}
              </p>
              <div className="mt-3 grid gap-2">
                {["Telegram", "Twitter/X", "Mirror", "Substack"].map((item) => (
                  <div
                    className="rounded-md border border-tint/10 bg-tint/[0.03] px-3 py-2 text-sm font-semibold text-muted"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </Container>
    </section>
  );
}

async function fetchDefaultSnsVideos() {
  const response = await fetch(`/api/sns?ts=${Date.now()}`, {
    cache: "no-store",
  });
  const data = (await response.json()) as SnsResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error ?? "SNS request failed");
  }

  return data;
}

async function fetchCustomRssVideos(sources: CustomRssSource[]) {
  if (sources.length === 0) {
    return {
      videos: [],
      count: 0,
      refreshedAt: new Date().toISOString(),
    } satisfies SnsResponse;
  }

  const response = await fetch("/api/custom-rss", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sources }),
  });
  const data = (await response.json()) as SnsResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error ?? "Custom RSS request failed");
  }

  return data;
}

function LoadingState() {
  return (
    <div className="overflow-hidden rounded-lg border border-tint/10 bg-surface/78">
      {[0, 1, 2, 3, 4].map((item) => (
        <div
          className="grid animate-pulse gap-4 border-b border-tint/10 px-4 py-4 last:border-b-0 md:grid-cols-[15rem_minmax(0,1fr)]"
          key={item}
        >
          <div className="aspect-video rounded-md bg-tint/10" />
          <div>
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded bg-tint/10" />
              <div className="h-5 w-28 rounded bg-tint/10" />
            </div>
            <div className="mt-4 h-5 w-4/5 rounded bg-tint/10" />
            <div className="mt-3 h-4 w-3/5 rounded bg-tint/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, title }: { message: string; title: string }) {
  return (
    <Card className="border-danger/30 bg-danger/10 p-6">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-2 break-words text-sm leading-6 text-muted">{message}</p>
    </Card>
  );
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Card className="p-6">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </Card>
  );
}

function NoMatchesState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Card className="p-6">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </Card>
  );
}

function filterVideos(
  videos: SnsVideo[],
  activeCategory: string,
  activeSources: string[],
  searchQuery: string,
) {
  const query = searchQuery.trim().toLowerCase();

  return videos.filter((video) => {
    const sourceMatches = activeSources.includes(video.sourceName);
    const categoryMatches =
      activeCategory === "All" ||
      video.category === activeCategory ||
      video.tags.includes(activeCategory);
    const queryMatches =
      query.length === 0 ||
      [video.title, video.description, video.sourceName, video.category, ...video.tags]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return sourceMatches && categoryMatches && queryMatches;
  });
}

function getCategoryCounts(
  videos: SnsVideo[],
  categories: string[],
  activeSources: string[],
  searchQuery: string,
) {
  const baseMatches = filterVideos(videos, "All", activeSources, searchQuery);
  const counts = Object.fromEntries(categories.map((c) => [c, 0])) as Record<string, number>;

  counts.All = baseMatches.length;

  for (const video of baseMatches) {
    for (const category of categories) {
      if (
        category !== "All" &&
        (video.category === category || video.tags.includes(category))
      ) {
        counts[category] += 1;
      }
    }
  }

  return counts;
}
