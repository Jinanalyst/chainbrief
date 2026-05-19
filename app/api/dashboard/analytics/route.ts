import { NextResponse } from "next/server";
import { getAnalystDashboardSnapshot, getCurrentUserContext } from "@/lib/analyst-data";

export async function GET() {
  try {
    const { user } = await getCurrentUserContext();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await getAnalystDashboardSnapshot(user.id);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json(emptySnapshot());
  }
}

function emptySnapshot() {
  return {
    thisMonthRevenue: 0,
    totalSubscribers: 0,
    postsPublished: 0,
    totalViews: 0,
    uniqueViewers: 0,
    totalComments: 0,
    totalLikes: 0,
    bullReactions: 0,
    bearReactions: 0,
    totalBookmarks: 0,
    totalRebriefs: 0,
    totalQuoteAnalyses: 0,
    followerGrowth: 0,
    analystScore: 0,
    rankingPosition: null,
    revenueEstimate: 0,
    revenueBars: [],
    engagementBars: [],
    topPosts: [],
    memberships: [],
    profile: null,
    tronAddress: null,
  };
}
