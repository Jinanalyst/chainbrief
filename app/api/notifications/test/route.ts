import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPushConfig, sendArticlePushNotification, type PushSubscriptionRecord } from "@/lib/push";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPushConfig()) {
    return NextResponse.json({ error: "Push config missing" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("notification_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, enabled, permission, language, keywords, user_agent")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .eq("permission", "granted")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "No active push subscription found." }, { status: 404 });
  }

  try {
    await sendArticlePushNotification(
      data as PushSubscriptionRecord,
      {
        id: `test-${Date.now()}`,
        title: "Browser notification test",
        slug: "browser-notification-test",
        sourceId: "chain-brief",
        sourceName: "Chain Brief",
        originalUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/settings`,
        publishedAt: new Date().toISOString(),
        excerpt: "This is a test push sent from your browser settings.",
        category: "All",
        tags: ["Test"],
        readingTime: "1 min",
        briefSummary: "This is a background browser notification test.",
        rawContentSnippet: "Test push",
      },
      data.language,
    );
  } catch (sendError) {
    return NextResponse.json(
      { error: sendError instanceof Error ? sendError.message : "Push send failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
