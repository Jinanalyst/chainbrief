import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AttachmentPayload = {
  kind: "image" | "video";
  name?: string;
  mime_type?: string;
  data_url: string;
  size?: number;
};

// POST /api/community/posts
// Persists a community post to Supabase public.posts (+ post_attachments) so it
// shows up across browsers. Requires the user to be signed in.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        title?: string;
        body?: string;
        category?: string;
        post_type?: string;
        coin_tags?: string[];
        linked_news_id?: string | null;
        quoted_post_id?: string | null;
        quote_kind?: string | null;
        metadata?: Record<string, unknown>;
        attachments?: AttachmentPayload[];
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

  // posts.author_id FK → profiles.id. Make sure the row exists.
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
    if (profileError && !profileError.message?.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
  }

  const insertRow: Record<string, unknown> = {
    author_id: user.id,
    title: body.title.trim().slice(0, 240),
    body: body.body.trim(),
    category: (body.category ?? "All").slice(0, 80),
    post_type: body.post_type ?? "general",
    coin_tags: Array.isArray(body.coin_tags) ? body.coin_tags.slice(0, 12) : [],
    linked_news_id: body.linked_news_id ?? null,
    status: "published",
    metadata: body.metadata ?? {},
  };

  // quoted_post_id / quote_kind were added by the social_engagement_threads migration.
  if (body.quoted_post_id) {
    insertRow.quoted_post_id = body.quoted_post_id;
    if (body.quote_kind) insertRow.quote_kind = body.quote_kind;
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert(insertRow)
    .select(
      "id, author_id, title, body, category, post_type, coin_tags, linked_news_id, status, view_count, created_at, updated_at, metadata, quoted_post_id, quote_kind",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attachments go into a sibling table. Best-effort: a failure here doesn't unwind the post.
  if (Array.isArray(body.attachments) && body.attachments.length && post?.id) {
    const rows = body.attachments
      .filter((a) => a && typeof a.data_url === "string" && a.data_url.length > 0)
      .slice(0, 8)
      .map((a, i) => ({
        post_id: post.id,
        kind: a.kind === "video" ? "video" : "image",
        name: a.name ?? null,
        mime_type: a.mime_type ?? null,
        data_url: a.data_url,
        size: typeof a.size === "number" ? a.size : null,
        position: i,
      }));
    if (rows.length) {
      await supabase.from("post_attachments").insert(rows);
    }
  }

  return NextResponse.json({ post });
}
