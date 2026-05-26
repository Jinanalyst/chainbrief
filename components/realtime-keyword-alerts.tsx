"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COMMUNITY_POSTS_CHANGED_EVENT,
  readCommunityPosts,
} from "@/lib/community";
import {
  articleToAlertItem,
  communityPostToAlertItem,
  findArticleKeywordMatch,
  findCommunityKeywordMatch,
  findSnsVideoKeywordMatch,
  snsVideoToAlertItem,
  type KeywordAlertItem,
} from "@/lib/keyword-alerts";
import type { BriefPreferences } from "@/lib/preferences";
import type { Article } from "@/lib/rss/types";
import type { SnsVideo } from "@/lib/sns/types";
import { usePreferences } from "@/lib/i18n/use-i18n";

type BriefsResponse = {
  articles?: Article[];
};

type SnsResponse = {
  videos?: SnsVideo[];
};

const POLL_INTERVAL_MS = 45 * 1000;
const MAX_SEEN_IDS = 240;

export function RealtimeKeywordAlerts() {
  const [preferences] = usePreferences();
  const preferencesRef = useRef<BriefPreferences>(preferences);
  const seenBriefIds = useRef<Set<string>>(new Set());
  const seenCommunityIds = useRef<Set<string>>(new Set());
  const seenSnsIds = useRef<Set<string>>(new Set());
  const initializedBriefs = useRef(false);
  const initializedCommunity = useRef(false);
  const initializedSns = useRef(false);
  const [activeAlert, setActiveAlert] = useState<{
    item: KeywordAlertItem;
    keyword: string;
  } | null>(null);

  const showAlert = useCallback(
    (item: KeywordAlertItem, keyword: string, prefs: BriefPreferences) => {
      setActiveAlert({ item, keyword });
      window.setTimeout(() => {
        setActiveAlert((current) => (current?.item.id === item.id ? null : current));
      }, 8500);

      if (prefs.notificationSoundEnabled) {
        playNotificationSound();
      }

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const notification = new Notification(`Chain Brief: ${keyword}`, {
            body: `${item.sourceName}: ${item.title}`,
            tag: `chain-brief-live-${item.id}`,
          });
          notification.onclick = () => {
            window.focus();
            window.location.assign(item.url);
          };
        } catch {
          // Browser notification failed; the in-app popup is still visible.
        }
      }
    },
    [],
  );

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    let ignore = false;

    async function checkBriefs() {
      const prefs = preferencesRef.current;
      if (!prefs.notificationsEnabled || prefs.notificationKeywords.length === 0) return;

      try {
        const response = await fetch(`/api/briefs?alerts=1&ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as BriefsResponse;
        const articles = data.articles ?? [];

        if (!initializedBriefs.current) {
          rememberIds(seenBriefIds.current, articles.map((article) => article.id));
          initializedBriefs.current = true;
          return;
        }

        for (const article of articles) {
          if (ignore || seenBriefIds.current.has(article.id)) continue;
          seenBriefIds.current.add(article.id);

          const keyword = findArticleKeywordMatch(article, prefs.notificationKeywords);
          if (keyword) {
            showAlert(articleToAlertItem(article), keyword, prefs);
            break;
          }
        }

        trimSeenIds(seenBriefIds.current);
      } catch {
        // Alert polling should never interrupt the app.
      }
    }

    void checkBriefs();
    const timer = window.setInterval(checkBriefs, POLL_INTERVAL_MS);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [showAlert]);

  useEffect(() => {
    let ignore = false;

    async function checkSnsVideos() {
      const prefs = preferencesRef.current;
      if (!prefs.notificationsEnabled || prefs.notificationKeywords.length === 0) return;

      try {
        const response = await fetch(`/api/sns?alerts=1&ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as SnsResponse;
        const videos = data.videos ?? [];

        if (!initializedSns.current) {
          rememberIds(seenSnsIds.current, videos.map((video) => video.id));
          initializedSns.current = true;
          return;
        }

        for (const video of videos) {
          if (ignore || seenSnsIds.current.has(video.id)) continue;
          seenSnsIds.current.add(video.id);

          const keyword = findSnsVideoKeywordMatch(video, prefs.notificationKeywords);
          if (keyword) {
            showAlert(snsVideoToAlertItem(video), keyword, prefs);
            break;
          }
        }

        trimSeenIds(seenSnsIds.current);
      } catch {
        // Alert polling should never interrupt the app.
      }
    }

    void checkSnsVideos();
    const timer = window.setInterval(checkSnsVideos, POLL_INTERVAL_MS);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [showAlert]);

  useEffect(() => {
    function checkCommunityPosts() {
      const prefs = preferencesRef.current;
      const posts = readCommunityPosts();

      if (!initializedCommunity.current) {
        rememberIds(seenCommunityIds.current, posts.map((post) => post.id));
        initializedCommunity.current = true;
        return;
      }

      if (!prefs.notificationsEnabled || prefs.notificationKeywords.length === 0) return;

      for (const post of posts) {
        if (seenCommunityIds.current.has(post.id)) continue;
        seenCommunityIds.current.add(post.id);

        const keyword = findCommunityKeywordMatch(post, prefs.notificationKeywords);
        if (keyword) {
          showAlert(communityPostToAlertItem(post), keyword, prefs);
          break;
        }
      }

      trimSeenIds(seenCommunityIds.current);
    }

    const timer = window.setTimeout(checkCommunityPosts, 0);
    window.addEventListener("storage", checkCommunityPosts);
    window.addEventListener(COMMUNITY_POSTS_CHANGED_EVENT, checkCommunityPosts);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", checkCommunityPosts);
      window.removeEventListener(COMMUNITY_POSTS_CHANGED_EVENT, checkCommunityPosts);
    };
  }, [showAlert]);

  if (!activeAlert) {
    return null;
  }

  const { item, keyword } = activeAlert;
  const kindLabel =
    item.kind === "community"
      ? preferences.language === "ko"
        ? "커뮤니티"
        : "Community"
      : item.kind === "breaking"
        ? preferences.language === "ko"
          ? "속보"
          : "Breaking"
        : item.kind === "creator"
          ? preferences.language === "ko"
            ? "크리에이터"
            : "Creator"
          : preferences.language === "ko"
            ? "뉴스 브리프"
            : "News Brief";

  return (
    <button
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-tint/10 bg-surface/95 p-0 text-left shadow-[0_20px_55px_rgba(0,0,0,0.34)] backdrop-blur transition hover:border-accent/40 sm:bottom-5 sm:right-5"
      onClick={() => window.location.assign(item.url)}
      type="button"
    >
      <div className="flex min-w-0 items-start gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
          CB
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded bg-accent/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-accent-ink">
              {kindLabel}
            </span>
            <span className="truncate text-[0.7rem] font-semibold text-muted-2">
              {keyword}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-ink">
            {item.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
            {item.sourceName} · {item.body}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="mt-0.5 text-lg leading-none text-muted-2"
          onClick={(event) => {
            event.stopPropagation();
            setActiveAlert(null);
          }}
        >
          x
        </span>
      </div>
    </button>
  );
}

function rememberIds(target: Set<string>, ids: string[]) {
  for (const id of ids) {
    target.add(id);
  }

  trimSeenIds(target);
}

function trimSeenIds(target: Set<string>) {
  if (target.size <= MAX_SEEN_IDS) return;

  const ids = Array.from(target);
  target.clear();
  for (const id of ids.slice(-MAX_SEEN_IDS)) {
    target.add(id);
  }
}

function playNotificationSound() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch {
    // Audio can be blocked until user interaction; alerts still work.
  }
}
