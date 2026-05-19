import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: briefId } = await params;
  const body = (await req.json().catch(() => null)) as
    | { body?: string; parentId?: string | null }
    | null;
  const text = body?.body?.trim();
  if (!text) {
    return NextResponse.json({ error: "empty comment" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("cb_brief_comments")
    .insert({
      brief_id: briefId,
      user_id: user.id,
      body: text.slice(0, 2000),
      parent_id: body?.parentId ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comment: data });
}
