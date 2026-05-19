import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import type { NextRequest } from "next/server";
import {
  AllRssSourcesFailedError,
  fetchFeeds,
  fetchPersonalizedFeeds,
} from "@/lib/rss/fetchFeeds";
import { fetchStoredBriefArticles } from "@/lib/rss/database";
import { RSS_REFRESH_SECONDS } from "@/lib/rss/sources";
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import {
  normalizeCustomRssSources,
  type CustomRssSource,
} from "@/lib/custom-rss-sources";

export const dynamic = "force-dynamic";

const getCachedFeeds = unstable_cache(fetchFeeds, ["chain-brief-rss-feeds"], {
  revalidate: RSS_REFRESH_SECONDS,
});

// Treat stored articles as fresh enough only when their newest item is within
// this many seconds of "now". Older than that and we prefer the live fetch.
const STORED_FRESHNESS_SECONDS = RSS_REFRESH_SECONDS * 2;

export async function GET() {
  try {
    const articles = await loadArticles();

    return NextResponse.json(
      {
        articles,
        count: articles.length,
        refreshedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof AllRssSourcesFailedError
        ? "All RSS sources failed. Try again after the next refresh interval."
        : "RSS feeds could not be loaded right now.";

    return NextResponse.json(
      {
        articles: [],
        count: 0,
        error: message,
        refreshedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

async function loadArticles() {
  // Prefer live RSS (memoized for RSS_REFRESH_SECONDS via unstable_cache) so
  // brief readers always get the latest source data. Fall back to stored
  // articles only if the live fetch fails outright, or if stored articles are
  // newer than the (potentially stale) cache snapshot.
  let live: Awaited<ReturnType<typeof getCachedFeeds>> | null = null;
  let liveError: unknown = null;
  try {
    live = await getCachedFeeds();
  } catch (error) {
    liveError = error;
  }

  if (!hasSupabaseAdminConfig()) {
    if (live) return live;
    throw liveError ?? new Error("RSS feeds unavailable");
  }

  let stored: Awaited<ReturnType<typeof fetchStoredBriefArticles>> = [];
  try {
    stored = await fetchStoredBriefArticles(createAdminClient());
  } catch {
    stored = [];
  }

  if (!live || live.length === 0) {
    if (stored.length > 0) return stored;
    if (live) return live;
    throw liveError ?? new Error("RSS feeds unavailable");
  }

  // If the DB has stored articles strictly newer than the live (cached) head,
  // use them — the ingest cron may have run more recently than the last
  // unstable_cache revalidation.
  const liveTopAt = timestamp(live[0]?.publishedAt);
  const storedTopAt = timestamp(stored[0]?.publishedAt);
  const cutoff = Date.now() - STORED_FRESHNESS_SECONDS * 1000;
  if (storedTopAt > liveTopAt && storedTopAt >= cutoff) {
    return stored;
  }
  return live;
}

function timestamp(value: string | undefined | null) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      sources?: CustomRssSource[];
    };
    const sources = normalizeCustomRssSources(body.sources);
    const articles = await fetchPersonalizedFeeds(sources);

    return NextResponse.json({
      articles,
      count: articles.length,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof AllRssSourcesFailedError
        ? "All RSS sources failed. Try again after the next refresh interval."
        : "RSS feeds could not be loaded right now.";

    return NextResponse.json(
      {
        articles: [],
        count: 0,
        error: message,
        refreshedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
