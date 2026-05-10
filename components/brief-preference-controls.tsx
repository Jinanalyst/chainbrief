"use client";

import { ACTIVE_SOURCES, BRIEF_CATEGORIES, type BriefPreferences } from "@/lib/preferences";
import { cn } from "@/lib/cn";
import { getCategoryLabel } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/use-i18n";

type BriefPreferenceControlsProps = {
  preferences: BriefPreferences;
  onChange: (preferences: BriefPreferences) => void;
};

export function BriefPreferenceControls({
  preferences,
  onChange,
}: BriefPreferenceControlsProps) {
  const { t: copy } = useI18n(preferences.language);

  function toggleSource(source: string) {
    const nextSources = preferences.sources.includes(source)
      ? preferences.sources.filter((item) => item !== source)
      : [...preferences.sources, source];

    onChange({
      ...preferences,
      sources: nextSources.length > 0 ? nextSources : [source],
    });
  }

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-surface/78 p-3 shadow-soft sm:p-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.preferences.sources}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACTIVE_SOURCES.map((source) => {
              const isActive = preferences.sources.includes(source);

              return (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-semibold transition",
                    isActive
                      ? "border-accent bg-accent text-white"
                      : "border-white/10 bg-white/[0.03] text-muted hover:text-ink",
                  )}
                  key={source}
                  onClick={() => toggleSource(source)}
                  type="button"
                >
                  {source}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.preferences.category}
          </p>
          <div className="mt-3 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
            {BRIEF_CATEGORIES.map((category) => (
              <button
                className={cn(
                  "whitespace-nowrap rounded-md border px-3 py-2 text-sm font-semibold transition",
                  preferences.category === category
                    ? "border-accent bg-accent text-white"
                    : "border-white/10 bg-white/[0.03] text-muted hover:text-ink",
                )}
                key={category}
                onClick={() => onChange({ ...preferences, category })}
                type="button"
              >
                {getCategoryLabel(category, preferences.language)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block min-w-0">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.preferences.includeKeywords}
          </span>
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
            onChange={(event) =>
              onChange({ ...preferences, includeKeywords: event.target.value })
            }
            placeholder="btc, etf, solana"
            value={preferences.includeKeywords}
          />
        </label>
        <label className="block min-w-0">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.preferences.excludeKeywords}
          </span>
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
            onChange={(event) =>
              onChange({ ...preferences, excludeKeywords: event.target.value })
            }
            placeholder="nft, meme"
            value={preferences.excludeKeywords}
          />
        </label>
      </div>

      <div className="mt-4 min-w-0 rounded-lg border border-white/10 bg-background/60 p-3 sm:p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {copy.feed.language}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            {
              value: "ko",
              label: copy.preferences.korean,
              description: copy.preferences.koreanDescription,
            },
            {
              value: "en",
              label: copy.preferences.english,
              description: copy.preferences.englishDescription,
            },
          ].map((language) => {
            const isActive = preferences.language === language.value;

            return (
              <button
                className={cn(
                  "rounded-md border p-3 text-left transition",
                  isActive
                    ? "border-accent bg-accent/15 text-ink"
                    : "border-white/10 bg-white/[0.03] text-muted hover:text-ink",
                )}
                key={language.value}
                onClick={() =>
                  onChange({
                    ...preferences,
                    language: language.value as BriefPreferences["language"],
                  })
                }
                type="button"
              >
                <span className="block text-sm font-semibold">{language.label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-2">
                  {language.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
