import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/community/posts
// Persists a community post to Supabase public.posts so it shows up across browsers.
// Requires the user to be signed in (auth.uid is the FK to profiles.id / posts.author_id).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        title?: string;
        body?: string;
        category?: string;
        post_type?: string;
        coin_tags?: string[];
        linked_news_id?: string | null;
      }
    | null;

  if (!body?.title?.trim() || !body?.body?.trim()) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in to publish to the community" }, { status: 401 });
  }

  // posts.author_id FK → profiles.id. Make sure the row exists, otherwise the insert fails.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const username =
      (typeof meta.username === "string" && meta.username) ||
      (typeof meta.preferred_username === "string" && meta.preferred_username) ||
      (typeof meta.name === "string" && meta.name) ||
      (typeof meta.full_name === "string" && meta.full_name) ||
      (user.email ? user.email.split("@")[0] : null) ||
      `user_${user.id.slice(0, 8)}`;
    const avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : null;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      avatar_url: avatarUrl,
    });
    // If two requests race and another already created the profile, ignore the duplicate.
    if (profileError && !profileError.message?.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
  }

  const insertRow = {
    author_id: user.id,
    title: body.title.trim().slice(0, 240),
    body: body.body.trim(),
    category: (body.category ?? "All").slice(0, 80),
    post_type: body.post_type ?? "general",
    coin_tags: Array.isArray(body.coin_tags) ? body.coin_tags.slice(0, 12) : [],
    linked_news_id: body.linked_news_id ?? null,
    status: "published",
  };

  const { data, error } = await supabase
    .from("posts")
    .insert(insertRow)
    .select(
      "id, author_id, title, body, category, post_type, coin_tags, linked_news_id, status, view_count, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}
