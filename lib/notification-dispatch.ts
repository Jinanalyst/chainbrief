import { fetchFeeds } from "@/lib/rss/fetchFeeds";
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import {
  findArticleNotificationKeyword,
  hasPushConfig,
  sendArticlePushNotification,
  type PushSubscriptionRecord,
} from "@/lib/push";
import type { Article } from "@/lib/rss/types";

export async function dispatchNotificationsForLatestBriefs() {
  if (!hasSupabaseAdminConfig() || !hasPushConfig()) {
    return { sent: 0, skipped: 0, reason: "missing_config" as const };
  }

  const supabase = createAdminClient();
  const articles = await fetchFeeds();
  const latestArticles = articles.slice(0, 25);

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("notification_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, enabled, permission, language, keywords, user_agent")
    .eq("enabled", true)
    .eq("permission", "granted");

  if (subscriptionsError) {
    throw subscriptionsError;
  }

  let sent = 0;
  let skipped = 0;

  for (const subscription of (subscriptions ?? []) as PushSubscriptionRecord[]) {
    const article = latestArticles.find((item) =>
      findArticleNotificationKeyword(item, subscription.keywords),
    );

    if (!article) {
      skipped += 1;
      continue;
    }

    const alreadySent = await wasArticleDelivered(supabase, subscription.id, article.id);
    if (alreadySent) {
      skipped += 1;
      continue;
    }

    try {
      const matchedKeyword = findArticleNotificationKeyword(article, subscription.keywords);
      await sendArticlePushNotification(subscription, article, subscription.language, matchedKeyword);
      await recordDelivery(supabase, subscription.id, article);
      sent += 1;
    } catch (error) {
      if (isExpiredSubscriptionError(error)) {
        await supabase.from("notification_subscriptions").delete().eq("id", subscription.id);
        skipped += 1;
        continue;
      }

      throw error;
    }
  }

  return { sent, skipped, reason: "ok" as const };
}

async function wasArticleDelivered(
  supabase: ReturnType<typeof createAdminClient>,
  subscriptionId: string,
  articleId: string,
) {
  const { data, error } = await supabase
    .from("notification_deliveries")
    .select("id")
    .eq("subscription_id", subscriptionId)
    .eq("article_id", articleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function recordDelivery(
  supabase: ReturnType<typeof createAdminClient>,
  subscriptionId: string,
  article: Article,
) {
  const { error } = await supabase.from("notification_deliveries").insert({
    subscription_id: subscriptionId,
    article_id: article.id,
    article_url: article.originalUrl,
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}

function isExpiredSubscriptionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode?: number }).statusCode === 410
  );
}
