import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/analyst/score?userId=...  → live analyst score for a user.
// No userId → returns the logged-in user's score (404 if not signed in).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const queryUserId = url.searchParams.get("userId");

  const supabase = await createClient();
  let userId = queryUserId;
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("cb_analyst_user_score")
    .select(
      "user_id, engagement_score, consistency_score, risk_score, invalidation_score, trust_score, total_score, tier",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // No activity yet → return zeros with rookie tier rather than 404, so UI can render.
  const score = data ?? {
    user_id: userId,
    engagement_score: 0,
    consistency_score: 0,
    risk_score: 0,
    invalidation_score: 0,
    trust_score: 0,
    total_score: 0,
    tier: "rookie_analyst",
  };

  return NextResponse.json({ score });
}
