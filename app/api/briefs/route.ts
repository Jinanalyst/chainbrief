import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import type { NextRequest } from "next/server";
import {
  AllRssSourcesFailedError,
  fetchFeeds,
  fetchPersonalizedFeeds,
} from "@/lib/rss/fetchFeeds";
import { RSS_REFRESH_SECONDS } from "@/lib/rss/sources";
import {
  normalizeCustomRssSources,
  type CustomRssSource,
} from "@/lib/custom-rss-sources";

export const revalidate = 1200;

const getCachedFeeds = unstable_cache(fetchFeeds, ["chain-brief-rss-feeds"], {
  revalidate: RSS_REFRESH_SECONDS,
});

export async function GET() {
  try {
    const articles = await getCachedFeeds();

    return NextResponse.json(
      {
        articles,
        count: articles.length,
        refreshedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${RSS_REFRESH_SECONDS}, stale-while-revalidate=300`,
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
