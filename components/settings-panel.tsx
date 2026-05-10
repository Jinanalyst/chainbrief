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
          <span className="text-sm font-semibold text-success">Preferences saved.</span>
        ) : null}
      </div>
    </Card>
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
