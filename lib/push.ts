import webpush from "web-push";
import { formatBriefSummary } from "@/lib/summary";
import type { Article } from "@/lib/rss/types";
import type { BriefPreferences } from "@/lib/preferences";

export type PushPermissionState = BriefPreferences["notificationPermission"];

export type PushSubscriptionRecord = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
  permission: PushPermissionState;
  language: BriefPreferences["language"];
  keywords: string[];
  user_agent: string | null;
};

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:hello@chainbrief.kr";

let vapidConfigured = false;

export function hasPushConfig() {
  return Boolean(vapidPublicKey && vapidPrivateKey);
}

export function getPushPublicKey() {
  return vapidPublicKey ?? "";
}

export function configureWebPush() {
  if (vapidConfigured || !hasPushConfig()) {
    return;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);
  vapidConfigured = true;
}

export function extractPushKeys(subscription: PushSubscriptionJSON) {
  return {
    p256dh: subscription.keys?.p256dh ?? "",
    auth: subscription.keys?.auth ?? "",
  };
}

export function articleMatchesNotificationKeywords(article: Article, keywords: string[]) {
  const normalizedKeywords = keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
  if (!normalizedKeywords.length) {
    return false;
  }

  const searchableText = [article.title, article.briefSummary, article.excerpt, ...article.tags]
    .join(" ")
    .toLowerCase();

  return normalizedKeywords.some((keyword) => searchableText.includes(keyword));
}

export async function sendArticlePushNotification(
  subscription: PushSubscriptionRecord,
  article: Article,
  language: BriefPreferences["language"] = "ko",
) {
  configureWebPush();

  const payload = JSON.stringify({
    title: "Chain Brief",
    body: createNotificationBody(article, language),
    url: article.originalUrl,
    tag: `chain-brief-${article.id}`,
  });

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    payload,
  );
}

function createNotificationBody(article: Article, language: BriefPreferences["language"]) {
  const brief = formatBriefSummary(article, language);
  const shortBrief = brief.length > 140 ? `${brief.slice(0, 137).trim()}...` : brief;

  return `${article.title}\n${article.sourceName}\n${shortBrief}`;
}
