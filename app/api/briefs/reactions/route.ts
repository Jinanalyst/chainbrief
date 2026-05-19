import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

type ReactionPayload = {
  articleId?: unknown;
  reaction?: unknown;
  visitorId?: unknown;
};

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ ok: false, reason: "missing_config" }, { status: 202 });
  }

  const payload = (await request.json().catch(() => ({}))) as ReactionPayload;
  const articleId = typeof payload.articleId === "string" ? payload.articleId.trim() : "";
  const reaction = payload.reaction === "bear" ? "bear" : payload.reaction === "bull" ? "bull" : "";
  const visitorId =
    typeof payload.visitorId === "string" && payload.visitorId.trim()
      ? payload.visitorId.trim().slice(0, 120)
      : request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

  if (!articleId || !reaction) {
    return NextResponse.json({ error: "Invalid reaction payload." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("brief_article_reactions").upsert(
    {
      article_id: articleId,
      visitor_id: visitorId,
      reaction,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "article_id,visitor_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
