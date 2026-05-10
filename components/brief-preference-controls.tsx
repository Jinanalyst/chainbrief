"use client";

import { ACTIVE_SOURCES, BRIEF_CATEGORIES, type BriefPreferences } from "@/lib/preferences";
import { cn } from "@/lib/cn";

type BriefPreferenceControlsProps = {
  preferences: BriefPreferences;
  onChange: (preferences: BriefPreferences) => void;
};

export function BriefPreferenceControls({
  preferences,
  onChange,
}: BriefPreferenceControlsProps) {
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
    <div className="rounded-lg border border-white/10 bg-surface/78 p-4 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Sources
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

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Category
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Include Keywords
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
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Exclude Keywords
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
    </div>
  );
}
