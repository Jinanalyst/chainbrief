"use client";

import type { BriefPreferences } from "@/lib/preferences";
import type { Article } from "@/lib/rss/types";
import { formatBriefSummary } from "@/lib/summary";

export const NOTIFIED_ARTICLES_STORAGE_KEY = "chain-brief-notified-articles";

export type BrowserNotificationPermission =
  BriefPreferences["notificationPermission"];

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }

  return window.Notification.requestPermission();
}

export function parseNotificationKeywords(value: string) {
  return value
    .split(/[,\n]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function formatNotificationKeywords(keywords: string[]) {
  return keywords.join("\n");
}

export function notifyMatchingArticles(
  articles: Article[],
  preferences: BriefPreferences,
) {
  if (
    typeof window === "undefined" ||
    !preferences.notificationsEnabled ||
    getBrowserNotificationPermission() !== "granted"
  ) {
    return;
  }

  const keywords = preferences.notificationKeywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);

  if (keywords.length === 0) {
    return;
  }

  const notifiedArticleIds = readNotifiedArticleIds();

  for (const article of articles) {
    if (notifiedArticleIds.has(article.id) || !articleMatchesKeywords(article, keywords)) {
      continue;
    }

    const notification = new window.Notification("Chain Brief", {
      body: createNotificationBody(article, preferences.language),
      tag: `chain-brief-${article.id}`,
    });

    notification.onclick = () => {
      window.open(article.originalUrl, "_blank", "noopener,noreferrer");
      notification.close();
    };

    notifiedArticleIds.add(article.id);
  }

  writeNotifiedArticleIds(notifiedArticleIds);
}

function articleMatchesKeywords(article: Article, keywords: string[]) {
  const searchableText = [
    article.title,
    article.briefSummary,
    article.excerpt,
    ...article.tags,
  ]
    .join(" ")
    .toLowerCase();

  return keywords.some((keyword) => searchableText.includes(keyword));
}

function createNotificationBody(
  article: Article,
  language: BriefPreferences["language"],
) {
  const brief = formatBriefSummary(article, language);
  const shortBrief = brief.length > 140 ? `${brief.slice(0, 137).trim()}...` : brief;

  return `${article.title}\n${article.sourceName}\n${shortBrief}`;
}

function readNotifiedArticleIds() {
  const stored = window.localStorage.getItem(NOTIFIED_ARTICLES_STORAGE_KEY);

  if (!stored) {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
  } catch {
    return new Set<string>();
  }
}

function writeNotifiedArticleIds(articleIds: Set<string>) {
  const ids = Array.from(articleIds).slice(-250);
  window.localStorage.setItem(NOTIFIED_ARTICLES_STORAGE_KEY, JSON.stringify(ids));
}
