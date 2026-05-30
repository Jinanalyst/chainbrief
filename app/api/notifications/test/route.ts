import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPushConfig, sendArticlePushNotification, type PushSubscriptionRecord } from "@/lib/push";

type TestNotificationBody = {
  keyword?: string;
};

export async function POST(request: Request) {
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

  let body: TestNotificationBody = {};
  try {
    body = (await request.json()) as TestNotificationBody;
  } catch {
    body = {};
  }

  const subscription = data as PushSubscriptionRecord;
  const testKeyword =
    typeof body.keyword === "string" && body.keyword.trim()
      ? body.keyword.trim()
      : subscription.keywords[0]?.trim() || null;

  try {
    await sendArticlePushNotification(
      subscription,
      {
        id: `test-${Date.now()}`,
        title: testKeyword
          ? `Browser notification test for ${testKeyword}`
          : "Browser notification test",
        slug: "browser-notification-test",
        sourceId: "chain-brief",
        sourceName: "Chain Brief",
        originalUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard?tab=settings`,
        publishedAt: new Date().toISOString(),
        excerpt: testKeyword
          ? `This is a test push for your ${testKeyword} keyword.`
          : "This is a test push sent from your browser settings.",
        category: "All",
        tags: ["Test", ...(testKeyword ? [testKeyword] : [])],
        readingTime: "1 min",
        briefSummary: testKeyword
          ? `Chain Brief will highlight ${testKeyword} when matching RSS briefs are found.`
          : "This is a background browser notification test.",
        rawContentSnippet: testKeyword ? `Test push ${testKeyword}` : "Test push",
      },
      data.language,
      testKeyword,
    );
  } catch (sendError) {
    return NextResponse.json(
      { error: sendError instanceof Error ? sendError.message : "Push send failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
