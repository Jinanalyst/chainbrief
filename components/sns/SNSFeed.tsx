"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CategoryTabs } from "@/components/sns/CategoryTabs";
import { SNSCard } from "@/components/sns/SNSCard";
import { SourceBadge } from "@/components/sns/SourceBadge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { snsSources, SNS_CATEGORIES } from "@/lib/sns/sources";
import type { SnsCategory, SnsVideo } from "@/lib/sns/types";
import { useI18n } from "@/lib/i18n/use-i18n";

type SnsResponse = {
  videos: SnsVideo[];
  count: number;
  refreshedAt: string;
  error?: string;
};

const ALL_SOURCES = "All";

export function SNSFeed() {
  const { language } = useI18n();
  const [videos, setVideos] = useState<SnsVideo[]>([]);
  const [activeCategory, setActiveCategory] = useState<SnsCategory>("All");
  const [activeSources, setActiveSources] = useState<string[]>(
    snsSources.map((source) => source.name),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSnsVideos() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/sns?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as SnsResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error ?? "SNS request failed");
        }

        if (isMounted) {
          setVideos(data.videos ?? []);
          setLastUpdatedAt(data.refreshedAt ?? new Date().toISOString());
        }
      } catch {
        if (isMounted) {
          setError("YouTube RSS feeds could not be loaded right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSnsVideos();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVideos = useMemo(
    () => filterVideos(videos, activeCategory, activeSources, searchQuery),
    [activeCategory, activeSources, searchQuery, videos],
  );
  const categoryCounts = useMemo(
    () => getCategoryCounts(videos, activeSources, searchQuery),
    [activeSources, searchQuery, videos],
  );

  function toggleSource(sourceName: string) {
    if (sourceName === ALL_SOURCES) {
      setActiveSources(snsSources.map((source) => source.name));
      return;
    }

    setActiveSources((current) => {
      const next = current.includes(sourceName)
        ? current.filter((source) => source !== sourceName)
        : [...current, sourceName];

      return next.length > 0 ? next : [sourceName];
    });
  }

  const allSourcesSelected = activeSources.length === snsSources.length;

  return (
    <section className="border-t border-white/10 bg-background/72">
      <Container className="pb-12 pt-5 lg:pb-16">
        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <BrandLogo full />
          <p className="max-w-xl text-sm leading-6 text-muted">
            A fast research feed for crypto creator and protocol content,
            starting with official YouTube RSS feeds.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              SNS
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Crypto research from creator feeds.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Scan YouTube research, macro, protocol, and security updates
              without API keys or scraping.
            </p>
            <p className="mt-2 text-xs font-medium text-muted-2">
              {lastUpdatedAt
                ? `Last updated ${new Date(lastUpdatedAt).toLocaleTimeString()}`
                : "Waiting for first refresh"}
            </p>
          </div>
        </div>

        <CategoryTabs
          activeCategory={activeCategory}
          counts={categoryCounts}
          onChange={setActiveCategory}
        />

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <div className="mb-4 rounded-lg border border-white/10 bg-surface/78 p-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Search SNS Feed
                </span>
                <input
                  className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ETF, restaking, Solana, security..."
                  value={searchQuery}
                />
              </label>
            </div>

            {isLoading ? <LoadingState /> : null}
            {!isLoading && error ? <ErrorState message={error} /> : null}
            {!isLoading && !error && videos.length === 0 ? <EmptyState /> : null}
            {!isLoading && !error && videos.length > 0 && filteredVideos.length === 0 ? (
              <NoMatchesState />
            ) : null}

            {!isLoading && !error && filteredVideos.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-white/10 bg-surface/78">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Research Feed
                  </p>
                  <span className="text-xs font-medium text-muted-2">
                    {filteredVideos.length} videos
                  </span>
                </div>
                <div className="divide-y divide-white/10">
                  {filteredVideos.map((video) => (
                    <SNSCard key={video.id} language={language} video={video} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Sources
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <SourceBadge
                  active={allSourcesSelected}
                  onClick={() => toggleSource(ALL_SOURCES)}
                >
                  All
                </SourceBadge>
                {snsSources.map((source) => (
                  <SourceBadge
                    active={activeSources.includes(source.name)}
                    key={source.id}
                    onClick={() => toggleSource(source.name)}
                  >
                    {source.name}
                  </SourceBadge>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Future Integrations
              </p>
              <div className="mt-3 grid gap-2">
                {["Telegram", "Twitter/X", "Mirror", "Substack"].map((item) => (
                  <div
                    className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-muted"
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

function LoadingState() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-surface/78">
      {[0, 1, 2, 3, 4].map((item) => (
        <div
          className="grid animate-pulse gap-4 border-b border-white/10 px-4 py-4 last:border-b-0 md:grid-cols-[15rem_minmax(0,1fr)]"
          key={item}
        >
          <div className="aspect-video rounded-md bg-white/10" />
          <div>
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded bg-white/10" />
              <div className="h-5 w-28 rounded bg-white/10" />
            </div>
            <div className="mt-4 h-5 w-4/5 rounded bg-white/10" />
            <div className="mt-3 h-4 w-3/5 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-danger/30 bg-danger/10 p-6">
      <p className="text-lg font-semibold text-ink">SNS fetching failed.</p>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="p-6">
      <p className="text-lg font-semibold text-ink">No SNS videos available.</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        The active YouTube RSS feeds returned no videos.
      </p>
    </Card>
  );
}

function NoMatchesState() {
  return (
    <Card className="p-6">
      <p className="text-lg font-semibold text-ink">
        No videos match the current filters.
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">
        Try a broader category, source selection, or search query.
      </p>
    </Card>
  );
}

function filterVideos(
  videos: SnsVideo[],
  activeCategory: SnsCategory,
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
  activeSources: string[],
  searchQuery: string,
) {
  const baseMatches = filterVideos(videos, "All", activeSources, searchQuery);
  const counts = Object.fromEntries(
    SNS_CATEGORIES.map((category) => [category, 0]),
  ) as Record<SnsCategory, number>;

  counts.All = baseMatches.length;

  for (const video of baseMatches) {
    for (const category of SNS_CATEGORIES) {
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
