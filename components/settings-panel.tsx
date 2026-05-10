"use client";

import { useState } from "react";
import { BriefPreferenceControls } from "@/components/brief-preference-controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  defaultPreferences,
  PREFERENCES_STORAGE_KEY,
  type BriefPreferences,
} from "@/lib/preferences";

export function SettingsPanel() {
  const [preferences, setPreferences] =
    useState<BriefPreferences>(() => readStoredPreferences());
  const [saved, setSaved] = useState(false);

  function savePreferences() {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function resetPreferences() {
    setPreferences(defaultPreferences);
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(defaultPreferences),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card className="p-5 sm:p-6">
        <BriefPreferenceControls preferences={preferences} onChange={setPreferences} />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={savePreferences} type="button">
            Save Preferences
          </Button>
          <Button onClick={resetPreferences} type="button" variant="secondary">
            Reset
          </Button>
          {saved ? (
            <span className="text-sm font-semibold text-success">
              Preferences saved.
            </span>
          ) : null}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Translation Layout
        </p>
        <h2 className="mt-3 text-xl font-semibold text-ink">
          Korean and English ready.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Language preference is saved locally and applied to feed labels,
          sidebar copy, and brief summary formatting. Korean mode structures RSS
          metadata into Korean summary labels; RSS article titles and excerpts
          remain as provided by each source until a real translation provider is
          added.
        </p>
        <div className="mt-4 rounded-md border border-white/10 bg-background/70 p-3">
          <p className="text-sm font-semibold text-ink">
            Current language: {preferences.language === "ko" ? "Korean" : "English"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            No login or database is required; this stays in browser localStorage.
          </p>
        </div>
      </Card>
    </div>
  );
}

function readStoredPreferences(): BriefPreferences {
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
