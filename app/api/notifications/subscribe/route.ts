import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPushKeys } from "@/lib/push";

type SubscribeBody = {
  subscription?: PushSubscriptionJSON;
  permission?: "default" | "granted" | "denied" | "unsupported";
  keywords?: string[];
  language?: "ko" | "en";
  enabled?: boolean;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SubscribeBody;
  const subscription = body.subscription;
  const endpoint = subscription?.endpoint ?? "";
  const keys = subscription ? extractPushKeys(subscription) : { p256dh: "", auth: "" };

  if (!endpoint || !keys.p256dh || !keys.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notification_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        enabled: body.enabled ?? true,
        permission: body.permission ?? "granted",
        language: body.language ?? "ko",
        keywords: Array.isArray(body.keywords) ? body.keywords.slice(0, 20) : [],
        user_agent: request.headers.get("user-agent"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notification_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", body.endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
