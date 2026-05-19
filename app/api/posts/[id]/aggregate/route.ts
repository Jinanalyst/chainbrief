import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Community posts share the cb_brief_* engagement tables (brief_id holds the post id).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  const [reactions, views, likes, saves, comments, reposts, shares, userRes] =
    await Promise.all([
      supabase
        .from("cb_brief_reactions")
        .select("user_id, reaction, reasoning, created_at")
        .eq("brief_id", postId),
      supabase.from("cb_brief_views").select("id", { count: "exact", head: true }).eq("brief_id", postId),
      supabase.from("cb_brief_likes").select("id", { count: "exact", head: true }).eq("brief_id", postId),
      supabase.from("cb_brief_saves").select("id", { count: "exact", head: true }).eq("brief_id", postId),
      supabase
        .from("cb_brief_comments")
        .select("id, user_id, body, parent_id, created_at")
        .eq("brief_id", postId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("cb_post_reposts").select("id", { count: "exact", head: true }).eq("post_id", postId),
      supabase.from("cb_post_shares").select("id", { count: "exact", head: true }).eq("post_id", postId),
      supabase.auth.getUser(),
    ]);

  const rs = reactions.data ?? [];
  const counts = { bullish: 0, bearish: 0, neutral: 0, need_more_data: 0 };
  for (const r of rs) {
    if (r.reaction in counts) counts[r.reaction as keyof typeof counts] += 1;
  }
  const total = rs.length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const me = userRes.data.user?.id ?? null;
  const myReaction = me ? rs.find((r) => r.user_id === me) ?? null : null;

  const commentRows = comments.data ?? [];
  const commentUserIds = Array.from(
    new Set(commentRows.map((c) => c.user_id).filter(Boolean)),
  ) as string[];
  let profileMap = new Map<string, { username: string | null; avatar_url: string | null }>();
  if (commentUserIds.length) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", commentUserIds);
    for (const p of profileRows ?? []) {
      profileMap.set(p.id as string, {
        username: (p.username as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      });
    }
  }
  const enrichedComments = commentRows.map((c) => ({
    ...c,
    author: profileMap.get(c.user_id as string)?.username ?? null,
    avatar_url: profileMap.get(c.user_id as string)?.avatar_url ?? null,
  }));

  return NextResponse.json({
    postId,
    counts,
    percentages: {
      bullish: pct(counts.bullish),
      bearish: pct(counts.bearish),
      neutral: pct(counts.neutral),
      need_more_data: pct(counts.need_more_data),
    },
    totalReactions: total,
    views: views.count ?? 0,
    likes: likes.count ?? 0,
    saves: saves.count ?? 0,
    comments: enrichedComments,
    reposts: reposts.count ?? 0,
    shares: shares.count ?? 0,
    topBull: rs.filter((r) => r.reaction === "bullish" && r.reasoning).slice(0, 3),
    topBear: rs.filter((r) => r.reaction === "bearish" && r.reasoning).slice(0, 3),
    myReaction,
  });
}
