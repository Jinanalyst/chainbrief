/**
 * GET /api/analyst/subscribers?analystId=<id>
 *
 * Returns the live subscriber count for an analyst from Supabase.
 * Falls back to { count: 0 } when the admin client is unavailable.
 *
 * Response: { count: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAdminConfig, createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const analystId = req.nextUrl.searchParams.get("analystId")?.trim();

  if (!analystId) {
    return NextResponse.json({ error: "analystId is required." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("newsletter_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("analyst_id", analystId)
      .is("cancelled_at", null);

    if (error) {
      // Table may not be created yet
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
