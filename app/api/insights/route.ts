import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  INSIGHT_CATEGORY_VALUES,
  isInsightAuthor,
  isInsightCategory,
  slugify,
  type Insight,
  type InsightCategory,
} from "@/lib/insights";

// GET /api/insights?category=crypto&status=published&mine=1
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const statusParam = url.searchParams.get("status");
  const mine = url.searchParams.get("mine") === "1";

  const supabase = await createClient();
  let query = supabase
    .from("cb_insights")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (mine) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "sign in required" }, { status: 401 });
    }
    query = query.eq("author_id", user.id);
  } else if (statusParam === "draft") {
    query = query.eq("status", "draft");
  } else {
    // Default public listing returns published posts + due scheduled posts.
    const nowIso = new Date().toISOString();
    query = query.or(
      `status.eq.published,and(status.eq.scheduled,published_at.lte.${nowIso})`,
    );
  }

  if (category && isInsightCategory(category)) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ insights: (data ?? []) as Insight[] });
}

// POST /api/insights — create a new draft. Author-gated.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (!isInsightAuthor(user.email)) {
    return NextResponse.json({ error: "not authorised to author insights" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    category?: string;
  };

  const title = (body.title ?? "Untitled insight").trim().slice(0, 240) || "Untitled insight";
  const category: InsightCategory = isInsightCategory(body.category)
    ? body.category
    : INSIGHT_CATEGORY_VALUES[0];

  // Pick a slug that is not yet taken.
  let slug = slugify(title);
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: existing } = await supabase
      .from("cb_insights")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!existing) {
      slug = candidate;
      break;
    }
  }

  const { data, error } = await supabase
    .from("cb_insights")
    .insert({
      author_id: user.id,
      title,
      slug,
      category,
      status: "draft",
      body: "",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ insight: data as Insight });
}
