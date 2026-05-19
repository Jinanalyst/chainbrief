import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CommunityEngagementMetrics } from "@/lib/community";

type Reaction = "bull" | "bear";
type EngagementAction =
  | "view"
  | "like"
  | "save"
  | "reaction"
  | "comment"
  | "rebrief"
  | "quote_analysis";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  const postIds = parsePostIds(request.nextUrl.searchParams.get("postIds"));

  if (!postIds.length) {
    return NextResponse.json({ metrics: {} });
  }

  const [postsResult, viewsResult, likesResult, savesResult, commentsResult, reactionsResult, quotesResult] =
    await Promise.all([
      supabase.from("posts").select("id, view_count").in("id", postIds),
      supabase.from("post_views").select("post_id").in("post_id", postIds),
      supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
      supabase.from("post_bookmarks").select("post_id, user_id").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
      supabase.from("post_reactions").select("post_id, user_id, reaction").in("post_id", postIds),
      supabase.from("posts").select("quoted_post_id, quote_kind").in("quoted_post_id", postIds).eq("status", "published"),
    ]);

  const metrics: Record<string, CommunityEngagementMetrics> = Object.fromEntries(
    postIds.map((postId) => [
      postId,
      {
        postId,
        views: 0,
        likes: 0,
        comments: 0,
        saves: 0,
        bull: 0,
        bear: 0,
        rebriefs: 0,
        quoteAnalyses: 0,
        likedByUser: false,
        savedByUser: false,
      },
    ]),
  ) as Record<string, CommunityEngagementMetrics>;

  for (const post of postsResult.data ?? []) {
    metrics[post.id].views = Math.max(metrics[post.id].views, Number(post.view_count ?? 0));
  }
  for (const view of viewsResult.data ?? []) {
    metrics[view.post_id].views += 1;
  }
  for (const like of likesResult.data ?? []) {
    metrics[like.post_id].likes += 1;
    if (userId && like.user_id === userId) metrics[like.post_id].likedByUser = true;
  }
  for (const save of savesResult.data ?? []) {
    metrics[save.post_id].saves += 1;
    if (userId && save.user_id === userId) metrics[save.post_id].savedByUser = true;
  }
  for (const comment of commentsResult.data ?? []) {
    metrics[comment.post_id].comments += 1;
  }
  for (const reaction of reactionsResult.data ?? []) {
    const value = reaction.reaction as Reaction;
    if (value === "bull") metrics[reaction.post_id].bull += 1;
    if (value === "bear") metrics[reaction.post_id].bear += 1;
    if (userId && reaction.user_id === userId) metrics[reaction.post_id].userReaction = value;
  }
  for (const quote of quotesResult.data ?? []) {
    const postId = quote.quoted_post_id;
    if (!postId || !metrics[postId]) continue;
    if (quote.quote_kind === "quote_analysis") metrics[postId].quoteAnalyses += 1;
    else metrics[postId].rebriefs += 1;
  }

  return NextResponse.json({ metrics });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const input = (await request.json().catch(() => null)) as {
    postId?: string;
    action?: EngagementAction;
    body?: string;
    value?: Reaction;
    sessionId?: string;
  } | null;

  if (!input?.postId || !input.action) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user ?? null;

  if (input.action === "view") {
    const sessionId = input.sessionId?.trim();
    if (!user && !sessionId) {
      return NextResponse.json({ error: "Missing session" }, { status: 400 });
    }
    await supabase.from("post_views").insert({
      post_id: input.postId,
      viewer_id: user?.id ?? null,
      session_id: user ? null : sessionId,
    });
    return NextResponse.json({ ok: true });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(supabase, user.id, getUserName(user));

  if (input.action === "like") {
    await toggleRow(supabase, "post_likes", input.postId, user.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "save") {
    await toggleRow(supabase, "post_bookmarks", input.postId, user.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "reaction") {
    if (input.value !== "bull" && input.value !== "bear") {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }
    await supabase.from("post_reactions").upsert(
      {
        post_id: input.postId,
        user_id: user.id,
        reaction: input.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "post_id,user_id" },
    );
    return NextResponse.json({ ok: true });
  }

  if (input.action === "comment") {
    const body = input.body?.trim();
    if (!body) return NextResponse.json({ error: "Missing comment" }, { status: 400 });
    await supabase.from("post_comments").insert({
      post_id: input.postId,
      user_id: user.id,
      body,
    });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "rebrief" || input.action === "quote_analysis") {
    const body = input.body?.trim();
    if (!body) return NextResponse.json({ error: "Missing take" }, { status: 400 });

    const { data: original, error } = await supabase
      .from("posts")
      .select("id, title, body, category, post_type, coin_tags")
      .eq("id", input.postId)
      .eq("status", "published")
      .single();

    if (error || !original) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await supabase.from("posts").insert({
      author_id: user.id,
      title:
        input.action === "quote_analysis"
          ? `Quote analysis: ${original.title}`
          : `Rebrief: ${original.title}`,
      body,
      category: original.category,
      post_type: input.action === "quote_analysis" ? "news_interpretation" : "general",
      coin_tags: original.coin_tags ?? [],
      linked_news_id: null,
      quoted_post_id: original.id,
      quote_kind: input.action,
      status: "published",
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

function parsePostIds(value: string | null) {
  return Array.from(new Set((value ?? "").split(",").map((item) => item.trim()).filter(Boolean))).slice(0, 100);
}

async function toggleRow(
  supabase: SupabaseClient,
  table: "post_likes" | "post_bookmarks",
  postId: string,
  userId: string,
) {
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.id) {
    await supabase.from(table).delete().eq("id", data.id);
    return;
  }

  await supabase.from(table).insert({ post_id: postId, user_id: userId });
}

async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
  username: string,
) {
  await supabase.from("profiles").upsert(
    {
      id: userId,
      username,
      role: "user",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
}

function getUserName(user: User) {
  return (
    (typeof user.user_metadata?.chainBriefProfile?.displayName === "string"
      ? user.user_metadata.chainBriefProfile.displayName
      : "") ||
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "") ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
    user.email ||
    "Chain Brief member"
  );
}
