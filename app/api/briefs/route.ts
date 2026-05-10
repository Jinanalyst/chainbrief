import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { AllRssSourcesFailedError, fetchFeeds } from "@/lib/rss/fetchFeeds";
import { RSS_REFRESH_SECONDS } from "@/lib/rss/sources";

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
