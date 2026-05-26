import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isInsightAuthor,
  isInsightCategory,
  slugify,
  type Insight,
} from "@/lib/insights";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cb_insights")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ insight: data as Insight });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (!isInsightAuthor(user.email)) {
    return NextResponse.json({ error: "not authorised" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    excerpt?: string | null;
    body?: string;
    category?: string;
    cover_image_url?: string | null;
    status?: string;
    slug?: string;
  };

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    update.title = body.title.trim().slice(0, 240) || "Untitled insight";
  }
  if (typeof body.excerpt === "string" || body.excerpt === null) {
    update.excerpt = body.excerpt ? body.excerpt.slice(0, 500) : null;
  }
  if (typeof body.body === "string") {
    update.body = body.body;
  }
  if (typeof body.category === "string" && isInsightCategory(body.category)) {
    update.category = body.category;
  }
  if (typeof body.cover_image_url === "string" || body.cover_image_url === null) {
    update.cover_image_url = body.cover_image_url || null;
  }
  if (body.status === "draft" || body.status === "published") {
    update.status = body.status;
    if (body.status === "published") {
      // Stamp published_at on first publish; keep existing otherwise (DB column not touched).
      const { data: current } = await supabase
        .from("cb_insights")
        .select("published_at")
        .eq("id", id)
        .maybeSingle();
      if (current && !current.published_at) {
        update.published_at = new Date().toISOString();
      }
    }
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    update.slug = slugify(body.slug);
  }

  const { data, error } = await supabase
    .from("cb_insights")
    .update(update)
    .eq("id", id)
    .eq("author_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ insight: data as Insight });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (!isInsightAuthor(user.email)) {
    return NextResponse.json({ error: "not authorised" }, { status: 403 });
  }

  const { error } = await supabase
    .from("cb_insights")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
