"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryTabs, getCategoryLabel } from "@/components/sns/CategoryTabs";
import { SNSCard } from "@/components/sns/SNSCard";
import { SourceBadge } from "@/components/sns/SourceBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  readCustomRssSources,
  type CustomRssSource,
} from "@/lib/custom-rss-sources";
import {
  CUSTOM_CREATOR_CATEGORIES_CHANGED_EVENT,
  addCustomCreatorCategory,
  readCustomCreatorCategories,
  removeCustomCreatorCategory,
} from "@/lib/custom-creator-categories";
import {
  CREATOR_CATEGORY_OVERRIDES_CHANGED_EVENT,
  readCreatorCategoryOverrides,
  setCreatorCategoryOverride,
  type CreatorCategoryOverrides,
} from "@/lib/creator-category-overrides";
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
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<CreatorCategoryOverrides>({});
  const [newCategoryName, setNewCategoryName] = useState("");
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
    function loadCustomCategories() {
      setCustomCategories(readCustomCreatorCategories());
    }
    function loadOverrides() {
      setOverrides(readCreatorCategoryOverrides());
    }
    function loadAll() {
      loadCustomSources();
      loadCustomCategories();
      loadOverrides();
    }

    loadAll();
    window.addEventListener("chain-brief-custom-rss-sources-changed", loadCustomSources);
    window.addEventListener(CUSTOM_CREATOR_CATEGORIES_CHANGED_EVENT, loadCustomCategories);
    window.addEventListener(CREATOR_CATEGORY_OVERRIDES_CHANGED_EVENT, loadOverrides);
    window.addEventListener("storage", loadAll);

    return () => {
      window.removeEventListener(
        "chain-brief-custom-rss-sources-changed",
        loadCustomSources,
      );
      window.removeEventListener(
        CUSTOM_CREATOR_CATEGORIES_CHANGED_EVENT,
        loadCustomCategories,
      );
      window.removeEventListener(
        CREATOR_CATEGORY_OVERRIDES_CHANGED_EVENT,
        loadOverrides,
      );
      window.removeEventListener("storage", loadAll);
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
    const fromSources = enabledCustomSources
      .map((s) => s.customCategory?.trim())
      .filter((c): c is string => Boolean(c));
    const fromOverrides = Object.values(overrides).map((c) => c.trim()).filter(Boolean);
    const fromStandalone = customCategories.map((c) => c.trim()).filter(Boolean);
    const unique = Array.from(new Set([...fromSources, ...fromOverrides, ...fromStandalone]));
    const base = SNS_CATEGORIES as string[];
    return [...base, ...unique.filter((c) => !base.includes(c))];
  }, [customCategories, enabledCustomSources, overrides]);

  const filteredVideos = useMemo(
    () => filterVideos(videos, activeCategory, effectiveActiveSources, searchQuery, overrides),
    [activeCategory, effectiveActiveSources, overrides, searchQuery, videos],
  );
  const visibleVideos = filteredVideos.slice(0, visibleVideoCount);
  const hasMoreVideos = visibleVideos.length < filteredVideos.length;
  const categoryCounts = useMemo(
    () => getCategoryCounts(videos, dynamicCategories, effectiveActiveSources, searchQuery, overrides),
    [dynamicCategories, effectiveActiveSources, overrides, searchQuery, videos],
  );

  function handleAddCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCustomCategories(addCustomCreatorCategory(trimmed));
    setNewCategoryName("");
  }

  function handleRemoveCategory(name: string) {
    setCustomCategories(removeCustomCreatorCategory(name));
  }

  function handleAssignSourceCategory(sourceId: string, category: string) {
    setCreatorCategoryOverride(sourceId, category || null);
    setOverrides(readCreatorCategoryOverrides());
  }

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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    el.style.gridTemplateColumns = sidebarCollapsed ? "44px 1fr" : "260px 1fr";
  }, [sidebarCollapsed]);

  const allSourcesSelected = activeSources.length === 0;

  const allSourceEntries = [
    ...snsSources.map((s) => ({ id: s.id, name: s.name })),
    ...enabledCustomSources.map((s) => ({ id: s.id, name: s.name })),
  ];

  const allSourcesForGrouping = [
    ...snsSources.map((s) => ({
      id: s.id,
      name: s.name,
      defaultCategory: s.category as string,
    })),
    ...enabledCustomSources.map((s) => ({
      id: s.id,
      name: s.name,
      defaultCategory: s.customCategory?.trim() || (s.category as string),
    })),
  ];

  return (
    <section className="border-t border-tint/10 bg-background/72">
      {/* Mobile top filter bar */}
      <div className="lg:hidden border-b border-tint/10 bg-background/95">
        <div className="flex overflow-x-auto gap-1.5 px-4 py-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SourceBadge active={allSourcesSelected} onClick={() => toggleSource(ALL_SOURCES)}>
            {copy.allSources}
          </SourceBadge>
          {allSourceEntries.map((source) => (
            <SourceBadge
              active={allSourcesSelected || activeSources.includes(source.name)}
              key={source.id}
              onClick={() => toggleSource(source.name)}
            >
              {source.name}
            </SourceBadge>
          ))}
        </div>
        <CategoryTabs
          activeCategory={activeCategory}
          categories={dynamicCategories}
          counts={categoryCounts}
          language={language}
          onChange={handleCategoryChange}
        />
      </div>

      {/* Desktop layout: CSS grid so column width is authoritative over child content */}
      <div
        className="lg:grid"
        ref={layoutRef}
        style={{ gridTemplateColumns: "260px 1fr", transition: "grid-template-columns 200ms ease-in-out" }}
      >
        {/* Left sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:border-r lg:border-tint/10 lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:overflow-hidden lg:min-w-0">
          {/* Inner wrapper matches visible area so the toggle stays clickable when collapsed */}
          <div
            className={cn(
              "flex h-full flex-col",
              sidebarCollapsed ? "w-11 min-w-11" : "w-[260px] min-w-[260px]",
            )}
          >
            {/* Sidebar header with toggle button */}
            <div
              className={cn(
                "flex shrink-0 items-center border-b border-tint/10 px-2 py-3",
                sidebarCollapsed ? "justify-center" : "justify-between",
              )}
            >
              {!sidebarCollapsed ? (
                <span className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {language === "ko" ? "필터" : "Filters"}
                </span>
              ) : null}
              <button
                aria-label={
                  sidebarCollapsed
                    ? language === "ko" ? "사이드바 펼치기" : "Expand sidebar"
                    : language === "ko" ? "사이드바 접기" : "Collapse sidebar"
                }
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-tint/10 bg-tint/[0.04] text-muted transition hover:text-ink"
                onClick={() => setSidebarCollapsed((v) => !v)}
                title={sidebarCollapsed
                  ? language === "ko" ? "펼치기" : "Expand"
                  : language === "ko" ? "접기" : "Collapse"}
                type="button"
              >
                <span aria-hidden>{sidebarCollapsed ? "›" : "‹"}</span>
              </button>
            </div>

            {sidebarCollapsed ? (
              /* Collapsed: abbreviated icon hints */
              <div className="flex flex-1 flex-col items-center gap-4 py-4 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted">
                <span aria-hidden title={language === "ko" ? "소스" : "Sources"}>소</span>
                <span aria-hidden title={language === "ko" ? "카테고리" : "Categories"}>카</span>
              </div>
            ) : (
              /* Expanded: full sidebar content */
              <>
                <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
                  {/* Sources */}
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      {copy.sources}
                    </p>
                    <div className="mt-3 space-y-0.5">
                      <SidebarItem
                        active={allSourcesSelected}
                        onClick={() => toggleSource(ALL_SOURCES)}
                      >
                        {copy.allSources}
                      </SidebarItem>
                      {allSourceEntries.map((source) => (
                        <SidebarItem
                          active={allSourcesSelected || activeSources.includes(source.name)}
                          key={source.id}
                          onClick={() => toggleSource(source.name)}
                        >
                          {source.name}
                        </SidebarItem>
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="border-t border-tint/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      {language === "ko" ? "카테고리" : "Categories"}
                    </p>
                    <div className="mt-3 space-y-0.5">
                      {dynamicCategories.map((category) => (
                        <button
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm font-semibold transition",
                            activeCategory === category
                              ? "bg-accent/15 text-accent-ink"
                              : "text-muted hover:bg-tint/[0.05] hover:text-ink",
                          )}
                          key={category}
                          onClick={() => handleCategoryChange(category)}
                          type="button"
                        >
                          <span>{getCategoryLabel(category, language)}</span>
                          <span className="text-xs font-medium text-muted-2">
                            {categoryCounts[category] ?? 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add category */}
                  <div className="border-t border-tint/10 p-4">
                    <div className="flex gap-2">
                      <input
                        className="min-h-9 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        maxLength={40}
                        onChange={(event) => setNewCategoryName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddCategory();
                          }
                        }}
                        placeholder={language === "ko" ? "+ 카테고리 추가" : "+ Add category"}
                        value={newCategoryName}
                      />
                      <button
                        className="shrink-0 rounded-md border border-accent/50 bg-accent/15 px-3 text-xs font-bold text-accent-ink transition hover:bg-accent/25 disabled:opacity-50"
                        disabled={!newCategoryName.trim()}
                        onClick={handleAddCategory}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                    {customCategories.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {customCategories.map((name) => (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-tint/10 bg-tint/[0.04] px-2.5 py-1 text-xs font-semibold text-muted"
                            key={name}
                          >
                            {name}
                            <button
                              aria-label={language === "ko" ? `${name} 삭제` : `Remove ${name}`}
                              className="ml-0.5 text-muted-2 transition hover:text-ink"
                              onClick={() => handleRemoveCategory(name)}
                              type="button"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Creator grouping */}
                  <div className="border-t border-tint/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      {language === "ko" ? "크리에이터 분류" : "Group creators"}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {allSourcesForGrouping.map((source) => {
                        const current = overrides[source.id] ?? "";
                        return (
                          <div
                            className="flex min-w-0 items-center gap-2 rounded-md border border-tint/10 bg-tint/[0.03] px-2.5 py-1.5"
                            key={source.id}
                          >
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
                              {source.name}
                            </span>
                            <select
                              className="max-w-[7.5rem] rounded-md border border-tint/10 bg-background px-2 py-1 text-xs font-semibold text-ink outline-none transition focus:border-accent"
                              onChange={(event) =>
                                handleAssignSourceCategory(source.id, event.target.value)
                              }
                              value={current}
                            >
                              <option value="">
                                {language === "ko"
                                  ? `기본 (${source.defaultCategory})`
                                  : `Default (${source.defaultCategory})`}
                              </option>
                              {dynamicCategories
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
                  </div>

                  {/* Future integrations */}
                  <div className="border-t border-tint/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      {copy.futureIntegrations}
                    </p>
                    <div className="mt-3 grid gap-1.5">
                      {["Telegram", "Twitter/X", "Mirror", "Substack"].map((item) => (
                        <div
                          className="rounded-md border border-tint/10 bg-tint/[0.03] px-3 py-2 text-sm font-semibold text-muted"
                          key={item}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom: 소스 관리 */}
                <div className="shrink-0 border-t border-tint/10 p-4">
                  <Button className="w-full" href="/settings" variant="secondary">
                    {language === "ko" ? "소스 관리" : "Manage sources"}
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-2">
                    {enabledCustomSources.length} / {customSources.length}{" "}
                    {language === "ko" ? "커스텀 소스 활성화" : "custom sources active"}
                  </p>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Page header */}
          <div className="mb-6">
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

          {/* Search */}
          <div className="mb-4 rounded-lg border border-tint/10 bg-surface/78 p-3 sm:p-4">
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

          {/* Feed states */}
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

          {/* Feed cards */}
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
      </div>
    </section>
  );
}

function SidebarItem({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center rounded-md px-2.5 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-accent/15 text-accent-ink"
          : "text-muted hover:bg-tint/[0.05] hover:text-ink",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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

function effectiveCategory(video: SnsVideo, overrides: CreatorCategoryOverrides) {
  return overrides[video.sourceId]?.trim() || video.category;
}

function filterVideos(
  videos: SnsVideo[],
  activeCategory: string,
  activeSources: string[],
  searchQuery: string,
  overrides: CreatorCategoryOverrides,
) {
  const query = searchQuery.trim().toLowerCase();

  return videos.filter((video) => {
    const sourceMatches = activeSources.includes(video.sourceName);
    const effective = effectiveCategory(video, overrides);
    const categoryMatches =
      activeCategory === "All" ||
      effective === activeCategory ||
      video.tags.includes(activeCategory);
    const queryMatches =
      query.length === 0 ||
      [video.title, video.description, video.sourceName, effective, ...video.tags]
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
  overrides: CreatorCategoryOverrides,
) {
  const baseMatches = filterVideos(videos, "All", activeSources, searchQuery, overrides);
  const counts = Object.fromEntries(categories.map((c) => [c, 0])) as Record<string, number>;

  counts.All = baseMatches.length;

  for (const video of baseMatches) {
    const effective = effectiveCategory(video, overrides);
    for (const category of categories) {
      if (
        category !== "All" &&
        (effective === category || video.tags.includes(category))
      ) {
        counts[category] += 1;
      }
    }
  }

  return counts;
}
