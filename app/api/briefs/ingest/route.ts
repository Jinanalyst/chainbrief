import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { fetchFeeds } from "@/lib/rss/fetchFeeds";
import { upsertBriefArticles } from "@/lib/rss/database";
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Supabase admin config is missing." },
      { status: 503 },
    );
  }

  try {
    const articles = await fetchFeeds({ withAiSummaries: true });
    const result = await upsertBriefArticles(createAdminClient(), articles);

    return NextResponse.json({
      ok: true,
      fetched: articles.length,
      stored: result.inserted,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "RSS ingestion failed.",
        refreshedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
