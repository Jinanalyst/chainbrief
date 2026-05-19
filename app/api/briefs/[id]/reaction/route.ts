import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID = ["bullish", "bearish", "neutral", "need_more_data"] as const;
type Reaction = (typeof VALID)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: briefId } = await params;
  if (!briefId) {
    return NextResponse.json({ error: "missing brief id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as
    | { reaction?: string; reasoning?: string }
    | null;

  if (!body || !VALID.includes(body.reaction as Reaction)) {
    return NextResponse.json({ error: "invalid reaction" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const reasoning = typeof body.reasoning === "string"
    ? body.reasoning.trim().slice(0, 1000)
    : null;

  const { error } = await supabase
    .from("cb_brief_reactions")
    .upsert(
      {
        brief_id: briefId,
        user_id: user.id,
        reaction: body.reaction,
        reasoning,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "brief_id,user_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: briefId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("cb_brief_reactions")
    .delete()
    .eq("brief_id", briefId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
