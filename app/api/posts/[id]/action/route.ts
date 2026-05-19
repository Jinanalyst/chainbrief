import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ACTIONS = ["like", "unlike", "save", "unsave", "repost", "unrepost", "share", "view"] as const;
type Action = (typeof ACTIONS)[number];

// Toggle/record engagement on a community post. Mirrors brief tables (post id stored as brief_id).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params;
  const body = (await req.json().catch(() => null)) as
    | { action?: string; channel?: string }
    | null;
  const action = body?.action as Action | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonymous views/shares allowed
  if (action === "view") {
    await supabase.from("cb_brief_views").insert({ brief_id: postId, user_id: user?.id ?? null });
    return NextResponse.json({ ok: true });
  }
  if (action === "share") {
    await supabase
      .from("cb_post_shares")
      .insert({ post_id: postId, user_id: user?.id ?? null, channel: body?.channel ?? null });
    return NextResponse.json({ ok: true });
  }

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  switch (action) {
    case "like":
      await supabase.from("cb_brief_likes").upsert(
        { brief_id: postId, user_id: user.id },
        { onConflict: "brief_id,user_id" },
      );
      break;
    case "unlike":
      await supabase.from("cb_brief_likes").delete().eq("brief_id", postId).eq("user_id", user.id);
      break;
    case "save":
      await supabase.from("cb_brief_saves").upsert(
        { brief_id: postId, user_id: user.id },
        { onConflict: "brief_id,user_id" },
      );
      break;
    case "unsave":
      await supabase.from("cb_brief_saves").delete().eq("brief_id", postId).eq("user_id", user.id);
      break;
    case "repost":
      await supabase.from("cb_post_reposts").upsert(
        { post_id: postId, user_id: user.id },
        { onConflict: "post_id,user_id" },
      );
      break;
    case "unrepost":
      await supabase.from("cb_post_reposts").delete().eq("post_id", postId).eq("user_id", user.id);
      break;
  }

  return NextResponse.json({ ok: true });
}
