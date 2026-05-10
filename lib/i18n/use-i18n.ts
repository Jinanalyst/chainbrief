"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultPreferences,
  PREFERENCES_STORAGE_KEY,
  type BriefPreferences,
} from "@/lib/preferences";
import { getDictionary, type Language } from "@/lib/i18n";

export const PREFERENCES_CHANGED_EVENT = "chain-brief-preferences-changed";

export function readStoredPreferences(): BriefPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);

  if (!stored) {
    return defaultPreferences;
  }

  try {
    return { ...defaultPreferences, ...JSON.parse(stored) };
  } catch {
    return defaultPreferences;
  }
}

export function writeStoredPreferences(preferences: BriefPreferences) {
  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(
    new CustomEvent(PREFERENCES_CHANGED_EVENT, {
      detail: preferences,
    }),
  );
}

export function usePreferences() {
  const [preferences, setPreferencesState] =
    useState<BriefPreferences>(() => readStoredPreferences());

  useEffect(() => {
    function syncPreferences() {
      setPreferencesState(readStoredPreferences());
    }

    window.addEventListener("storage", syncPreferences);
    window.addEventListener(PREFERENCES_CHANGED_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(PREFERENCES_CHANGED_EVENT, syncPreferences);
    };
  }, []);

  function setPreferences(preferences: BriefPreferences) {
    setPreferencesState(preferences);
    writeStoredPreferences(preferences);
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
