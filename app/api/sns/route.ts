import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import {
  AllSnsSourcesFailedError,
  fetchYouTubeFeeds,
} from "@/lib/sns/fetchYouTubeFeeds";
import { SNS_REFRESH_SECONDS } from "@/lib/sns/sources";

export const revalidate = 1200;

const getCachedSnsFeeds = unstable_cache(
  fetchYouTubeFeeds,
  ["chain-brief-sns-youtube-feeds-v3"],
  {
    revalidate: SNS_REFRESH_SECONDS,
  },
);

export async function GET() {
  try {
    const videos = await getCachedSnsFeeds();

    return NextResponse.json(
      {
        videos,
        count: videos.length,
        refreshedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${SNS_REFRESH_SECONDS}, stale-while-revalidate=300`,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof AllSnsSourcesFailedError
        ? "All YouTube RSS sources failed. Try again after the next refresh interval."
        : "SNS feeds could not be loaded right now.";

    return NextResponse.json(
      {
        videos: [],
        count: 0,
        error: message,
        refreshedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
