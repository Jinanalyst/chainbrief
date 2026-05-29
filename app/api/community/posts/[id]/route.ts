import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

type AttachmentPayload = {
  kind: "image" | "video";
  name?: string;
  mime_type?: string;
  data_url: string;
  size?: number;
};

// PATCH /api/community/posts/[id]
// Edits an existing community post in Supabase public.posts. Only the post's
// author may edit it; the author_id filter doubles as the authorisation check.
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    category?: string;
    post_type?: string;
    coin_tags?: string[];
    linked_news_id?: string | null;
    metadata?: Record<string, unknown>;
    attachments?: AttachmentPayload[];
  };

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    update.title = title.slice(0, 240);
  }
  if (typeof body.body === "string") {
    const text = body.body.trim();
    if (!text) {
      return NextResponse.json({ error: "body cannot be empty" }, { status: 400 });
    }
    update.body = text;
  }
  if (typeof body.category === "string") {
    update.category = body.category.slice(0, 80);
  }
  if (typeof body.post_type === "string") {
    update.post_type = body.post_type;
  }
  if (Array.isArray(body.coin_tags)) {
    update.coin_tags = body.coin_tags.slice(0, 12);
  }
  if (typeof body.linked_news_id === "string" || body.linked_news_id === null) {
    update.linked_news_id = body.linked_news_id ?? null;
  }
  if (body.metadata && typeof body.metadata === "object") {
    update.metadata = body.metadata;
  }

  if (Object.keys(update).length === 0 && !Array.isArray(body.attachments)) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  // The author_id filter means a non-author's update simply matches no rows.
  const { data: post, error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", id)
    .eq("author_id", user.id)
    .select(
      "id, author_id, title, body, category, post_type, coin_tags, linked_news_id, status, view_count, created_at, updated_at, metadata, quoted_post_id, quote_kind",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: "post not found or not yours to edit" }, { status: 404 });
  }

  // Attachments are replace-all when an array is supplied: clear the old rows,
  // then insert the new set. Best-effort — a failure here doesn't unwind the edit.
  if (Array.isArray(body.attachments)) {
    await supabase.from("post_attachments").delete().eq("post_id", id);
    const rows = body.attachments
      .filter((a) => a && typeof a.data_url === "string" && a.data_url.length > 0)
      .slice(0, 8)
      .map((a, i) => ({
        post_id: id,
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

// DELETE /api/community/posts/[id]
// Removes a community post the signed-in user authored. Attachments cascade via
// the FK; we also delete them explicitly in case the cascade isn't configured.
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  // Confirm the post exists and belongs to the caller before deleting.
  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "post not found or not yours to delete" }, { status: 404 });
  }

  await supabase.from("post_attachments").delete().eq("post_id", id);

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
