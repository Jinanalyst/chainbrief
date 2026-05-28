"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  defaultPreferences,
  PREFERENCES_STORAGE_KEY,
  type BriefPreferences,
} from "@/lib/preferences";
import { getDictionary, type Language } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export const PREFERENCES_CHANGED_EVENT = "chain-brief-preferences-changed";
const USER_METADATA_PREFERENCES_KEY = "brief_preferences";
let localPreferencesVersion = 0;

export function readStoredPreferences(): BriefPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);

  if (!stored) {
    return defaultPreferences;
  }

  try {
    const parsed = JSON.parse(stored);
    const notificationKeywords = Array.isArray(parsed.notificationKeywords)
      ? parsed.notificationKeywords.filter(
          (keyword: unknown): keyword is string => typeof keyword === "string",
        )
      : defaultPreferences.notificationKeywords;
    const priorityKeywords = Array.isArray(parsed.priorityKeywords)
      ? parsed.priorityKeywords.filter(
          (keyword: unknown): keyword is string => typeof keyword === "string",
        )
      : defaultPreferences.priorityKeywords;

    return {
      ...defaultPreferences,
      ...parsed,
      notificationKeywords,
      priorityKeywords,
    };
  } catch {
    return defaultPreferences;
  }
}

export function normalizeStoredPreferences(value: unknown): BriefPreferences {
  if (!value || typeof value !== "object") {
    return defaultPreferences;
  }

  const parsed = value as Partial<BriefPreferences>;
  const sources = Array.isArray(parsed.sources)
    ? parsed.sources.filter(
        (source: unknown): source is string => typeof source === "string",
      )
    : defaultPreferences.sources;
  const notificationKeywords = Array.isArray(parsed.notificationKeywords)
    ? parsed.notificationKeywords.filter(
        (keyword: unknown): keyword is string => typeof keyword === "string",
      )
    : defaultPreferences.notificationKeywords;
  const stockRegions = Array.isArray(parsed.stockRegions)
    ? parsed.stockRegions.filter(
        (region: unknown): region is string => typeof region === "string",
      )
    : defaultPreferences.stockRegions;
  const stockTypes = Array.isArray(parsed.stockTypes)
    ? parsed.stockTypes.filter(
        (type: unknown): type is string => typeof type === "string",
      )
    : defaultPreferences.stockTypes;
  const language = parsed.language === "en" ? "en" : "ko";
  const notificationPermission =
    parsed.notificationPermission === "granted" ||
    parsed.notificationPermission === "denied" ||
    parsed.notificationPermission === "unsupported"
      ? parsed.notificationPermission
      : "default";

  return {
    ...defaultPreferences,
    ...parsed,
    sources: sources.length > 0 ? sources : defaultPreferences.sources,
    category:
      typeof parsed.category === "string"
        ? parsed.category
        : defaultPreferences.category,
    includeKeywords:
      typeof parsed.includeKeywords === "string" ? parsed.includeKeywords : "",
    excludeKeywords:
      typeof parsed.excludeKeywords === "string" ? parsed.excludeKeywords : "",
    stockRegions: stockRegions.length > 0 ? stockRegions : defaultPreferences.stockRegions,
    stockTypes: stockTypes.length > 0 ? stockTypes : defaultPreferences.stockTypes,
    language,
    notificationsEnabled: Boolean(parsed.notificationsEnabled),
    notificationSoundEnabled:
      typeof parsed.notificationSoundEnabled === "boolean"
        ? parsed.notificationSoundEnabled
        : defaultPreferences.notificationSoundEnabled,
    notificationKeywords,
    notificationPermission,
    priorityKeywords: Array.isArray(parsed.priorityKeywords)
      ? parsed.priorityKeywords.filter(
          (keyword: unknown): keyword is string => typeof keyword === "string",
        )
      : defaultPreferences.priorityKeywords,
    dateFrom: typeof parsed.dateFrom === "string" ? parsed.dateFrom : null,
    dateTo: typeof parsed.dateTo === "string" ? parsed.dateTo : null,
  };
}

export function writeStoredPreferences(
  preferences: BriefPreferences,
  source: "local" | "remote" = "local",
) {
  if (source === "local") {
    localPreferencesVersion += 1;
  }

  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(
    new CustomEvent(PREFERENCES_CHANGED_EVENT, {
      detail: preferences,
    }),
  );
}

export function usePreferences() {
  const [preferences, setPreferencesState] =
    useState<BriefPreferences>(defaultPreferences);
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const userRef = useRef<User | null>(null);
  const initialLocalPreferencesVersion = useRef(localPreferencesVersion);

  useEffect(() => {
    function syncPreferences() {
      setPreferencesState(readStoredPreferences());
    }

    const timer = window.setTimeout(syncPreferences, 0);
    window.addEventListener("storage", syncPreferences);
    window.addEventListener(PREFERENCES_CHANGED_EVENT, syncPreferences);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(PREFERENCES_CHANGED_EVENT, syncPreferences);
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    function applyUserPreferences(user: User | null) {
      userRef.current = user;

      const userPreferences = normalizeStoredPreferences(
        user?.user_metadata?.[USER_METADATA_PREFERENCES_KEY],
      );
      const hasUserPreferences = Boolean(
        user?.user_metadata?.[USER_METADATA_PREFERENCES_KEY],
      );

      if (hasUserPreferences) {
        if (localPreferencesVersion !== initialLocalPreferencesVersion.current) {
          void saveUserPreferences(supabase, user, readStoredPreferences());
          return;
        }

        setPreferencesState(userPreferences);
        writeStoredPreferences(userPreferences, "remote");
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      applyUserPreferences(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUserPreferences(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  function setPreferences(preferences: BriefPreferences) {
    setPreferencesState(preferences);
    writeStoredPreferences(preferences);
    void saveUserPreferences(supabase, userRef.current, preferences);
  }

  return [preferences, setPreferences] as const;
}

export function useI18n(language?: Language) {
  const [preferences] = usePreferences();
  const activeLanguage = language ?? preferences.language;

  return useMemo(
    () => ({
      language: activeLanguage,
      t: getDictionary(activeLanguage),
    }),
    [activeLanguage],
  );
}

async function saveUserPreferences(
  supabase: SupabaseClient | null,
  user: User | null,
  preferences: BriefPreferences,
) {
  if (!supabase || !user) {
    return;
  }

  await supabase.auth.updateUser({
    data: {
      [USER_METADATA_PREFERENCES_KEY]: preferences,
    },
  });
}
