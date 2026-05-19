import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: briefId } = await params;
  const supabase = await createClient();

  const [reactionsRes, commentsRes, viewsRes, likesRes, savesRes, userRes] =
    await Promise.all([
      supabase
        .from("cb_brief_reactions")
        .select("user_id, reaction, reasoning, created_at")
        .eq("brief_id", briefId),
      supabase
        .from("cb_brief_comments")
        .select("id, user_id, body, parent_id, created_at")
        .eq("brief_id", briefId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("cb_brief_views")
        .select("id", { count: "exact", head: true })
        .eq("brief_id", briefId),
      supabase
        .from("cb_brief_likes")
        .select("id", { count: "exact", head: true })
        .eq("brief_id", briefId),
      supabase
        .from("cb_brief_saves")
        .select("id", { count: "exact", head: true })
        .eq("brief_id", briefId),
      supabase.auth.getUser(),
    ]);

  const reactions = reactionsRes.data ?? [];
  const counts = { bullish: 0, bearish: 0, neutral: 0, need_more_data: 0 };
  for (const r of reactions) {
    if (r.reaction in counts) {
      counts[r.reaction as keyof typeof counts] += 1;
    }
  }
  const total = reactions.length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const topBull = reactions
    .filter((r) => r.reaction === "bullish" && r.reasoning && r.reasoning.length > 0)
    .slice(0, 5)
    .map((r) => ({ reasoning: r.reasoning, user_id: r.user_id, created_at: r.created_at }));
  const topBear = reactions
    .filter((r) => r.reaction === "bearish" && r.reasoning && r.reasoning.length > 0)
    .slice(0, 5)
    .map((r) => ({ reasoning: r.reasoning, user_id: r.user_id, created_at: r.created_at }));

  const currentUserId = userRes.data.user?.id ?? null;
  const myReaction = currentUserId
    ? reactions.find((r) => r.user_id === currentUserId) ?? null
    : null;

  return NextResponse.json({
    briefId,
    counts,
    percentages: {
      bullish: pct(counts.bullish),
      bearish: pct(counts.bearish),
      neutral: pct(counts.neutral),
      need_more_data: pct(counts.need_more_data),
    },
    total,
    views: viewsRes.count ?? 0,
    likes: likesRes.count ?? 0,
    saves: savesRes.count ?? 0,
    comments: commentsRes.data ?? [],
    topBull,
    topBear,
    myReaction,
  });
}
