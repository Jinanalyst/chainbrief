"use client";

import { useState } from "react";
import { BriefPreferenceControls } from "@/components/brief-preference-controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { defaultPreferences } from "@/lib/preferences";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";

export function SettingsPanel() {
  const [preferences, setPreferences] = usePreferences();
  const { t: copy } = useI18n(preferences.language);
  const [saved, setSaved] = useState(false);

  function savePreferences() {
    setPreferences(preferences);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function resetPreferences() {
    setPreferences(defaultPreferences);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card className="p-5 sm:p-6">
        <BriefPreferenceControls preferences={preferences} onChange={setPreferences} />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={savePreferences} type="button">
            {copy.preferences.save}
          </Button>
          <Button onClick={resetPreferences} type="button" variant="secondary">
            {copy.preferences.reset}
          </Button>
          {saved ? (
            <span className="text-sm font-semibold text-success">
              {copy.preferences.saved}
            </span>
          ) : null}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.preferences.translationLayout}
        </p>
        <h2 className="mt-3 text-xl font-semibold text-ink">
          {copy.preferences.languageTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          {copy.preferences.languageHelp} {copy.preferences.languageNote}
        </p>
        <div className="mt-4 rounded-md border border-white/10 bg-background/70 p-3">
          <p className="text-sm font-semibold text-ink">
            {copy.preferences.currentLanguage}:{" "}
            {preferences.language === "ko"
              ? copy.preferences.korean
              : copy.preferences.english}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {copy.preferences.noLogin}
          </p>
        </div>
      </Card>
    </div>
  );
}
