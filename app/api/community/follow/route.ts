import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  const ids = parseIds(request.nextUrl.searchParams.get("ids"));

  if (!userId || ids.length === 0) {
    return NextResponse.json({ following: {} });
  }

  const { data } = await supabase
    .from("profile_follows")
    .select("followed_id")
    .eq("follower_id", userId)
    .in("followed_id", ids);

  const following: Record<string, boolean> = {};
  for (const id of ids) following[id] = false;
  for (const row of data ?? []) following[row.followed_id as string] = true;

  return NextResponse.json({ following });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = (await request.json().catch(() => null)) as {
    targetId?: string;
  } | null;
  const targetId = body?.targetId?.trim();
  if (!targetId) {
    return NextResponse.json({ error: "Missing targetId" }, { status: 400 });
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.id === targetId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("profile_follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("followed_id", targetId)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("profile_follows").delete().eq("id", existing.id);
    return NextResponse.json({ following: false });
  }

  await supabase.from("profile_follows").insert({
    follower_id: user.id,
    followed_id: targetId,
  });
  return NextResponse.json({ following: true });
}

function parseIds(value: string | null) {
  return Array.from(
    new Set((value ?? "").split(",").map((item) => item.trim()).filter(Boolean)),
  ).slice(0, 100);
}
