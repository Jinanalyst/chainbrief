"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { BriefPreferences } from "@/lib/preferences";

type BriefKeywordSettingsProps = {
  preferences: BriefPreferences;
  onChange: (preferences: BriefPreferences) => void;
};

const copy = {
  ko: {
    title: "키워드 정렬 및 필터",
    description:
      "브리프 피드의 제목·내용에서 키워드를 찾아 필터링하거나, 일치하는 브리프를 피드 상단으로 올립니다.",
    filterTitle: "필터 키워드",
    filterHelp: "입력한 키워드 중 하나라도 포함된 브리프만 표시합니다. 비워두면 모든 브리프가 표시됩니다.",
    priorityTitle: "우선순위 키워드",
    priorityHelp: "일치하는 브리프를 피드 상단으로 정렬합니다. 일치 개수가 많을수록 위로 올라갑니다.",
    placeholder: "키워드 입력 후 Enter",
    add: "추가",
    empty: "키워드를 줄바꿈 또는 쉼표로 추가하세요.",
    dateTitle: "날짜 필터",
    dateHelp: "선택한 날짜 범위에 발행된 브리프만 표시합니다. 한 칸만 채우면 그 날짜 이후/이전으로 필터됩니다.",
    dateFrom: "시작일",
    dateTo: "종료일",
    dateClear: "날짜 초기화",
    dateToday: "오늘",
  },
  en: {
    title: "Keyword Sort & Filter",
    description:
      "Find keywords in brief titles and bodies to filter the feed, or float matches to the top.",
    filterTitle: "Filter Keywords",
    filterHelp:
      "Only briefs containing any of these keywords are shown. Leave empty to show everything.",
    priorityTitle: "Priority Keywords",
    priorityHelp:
      "Sort matching briefs to the top of the feed. More matches rank higher.",
    placeholder: "Type a keyword, press Enter",
    add: "Add",
    empty: "Add keywords separated by new lines or commas.",
    dateTitle: "Date Filter",
    dateHelp:
      "Only show briefs published within this date range. Set one side to filter after/before that date.",
    dateFrom: "From",
    dateTo: "To",
    dateClear: "Clear dates",
    dateToday: "Today",
  },
} as const;

function parseStringToList(value: string) {
  return value
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean);
}

export function BriefKeywordSettings({
  preferences,
  onChange,
}: BriefKeywordSettingsProps) {
  const text = copy[preferences.language];

  const filterKeywords = parseStringToList(preferences.includeKeywords);
  const priorityKeywords = preferences.priorityKeywords;

  function setFilterKeywords(next: string[]) {
    onChange({ ...preferences, includeKeywords: next.join(", ") });
  }

  function setPriorityKeywords(next: string[]) {
    onChange({ ...preferences, priorityKeywords: next });
  }

  return (
    <div className="mt-4 min-w-0 rounded-lg border border-tint/10 bg-background/60 p-3 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {text.title}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-muted">
        {text.description}
      </p>

      <KeywordEditor
        addLabel={text.add}
        emptyLabel={text.empty}
        helpLabel={text.filterHelp}
        keywords={filterKeywords}
        onChange={setFilterKeywords}
        placeholder={text.placeholder}
        title={text.filterTitle}
        tone="filter"
      />

      <KeywordEditor
        addLabel={text.add}
        emptyLabel={text.empty}
        helpLabel={text.priorityHelp}
        keywords={priorityKeywords}
        onChange={setPriorityKeywords}
        placeholder={text.placeholder}
        title={text.priorityTitle}
        tone="priority"
      />

      <div className="mt-4 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {text.dateTitle}
        </p>
        <p className="mt-1 break-words text-xs leading-5 text-muted-2">
          {text.dateHelp}
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {text.dateFrom}
            <input
              className="min-h-10 rounded-md border border-tint/10 bg-background px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              max={preferences.dateTo ?? undefined}
              onChange={(event) =>
                onChange({ ...preferences, dateFrom: event.target.value || null })
              }
              type="date"
              value={preferences.dateFrom ?? ""}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {text.dateTo}
            <input
              className="min-h-10 rounded-md border border-tint/10 bg-background px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              min={preferences.dateFrom ?? undefined}
              onChange={(event) =>
                onChange({ ...preferences, dateTo: event.target.value || null })
              }
              type="date"
              value={preferences.dateTo ?? ""}
            />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            className="rounded-md border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:bg-accent/20"
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              onChange({ ...preferences, dateFrom: today, dateTo: today });
            }}
            type="button"
          >
            {text.dateToday}
          </button>
          {(preferences.dateFrom || preferences.dateTo) && (
            <button
              className="rounded-md border border-tint/15 bg-tint/[0.04] px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-ink"
              onClick={() => onChange({ ...preferences, dateFrom: null, dateTo: null })}
              type="button"
            >
              {text.dateClear}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function KeywordEditor({
  addLabel,
  emptyLabel,
  helpLabel,
  keywords,
  onChange,
  placeholder,
  title,
  tone,
}: {
  addLabel: string;
  emptyLabel: string;
  helpLabel: string;
  keywords: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  title: string;
  tone: "filter" | "priority";
}) {
  const [input, setInput] = useState("");

  function add() {
    const next = input
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean)
      .filter((k) => !keywords.includes(k));

    if (!next.length) {
      setInput("");
      return;
    }

    onChange([...keywords, ...next].slice(0, 30));
    setInput("");
  }

  function remove(keyword: string) {
    onChange(keywords.filter((k) => k !== keyword));
  }

  return (
    <div className="mt-4 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {title}
      </p>
      <p className="mt-1 break-words text-xs leading-5 text-muted-2">
        {helpLabel}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          className="min-h-10 flex-1 rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          value={input}
        />
        <button
          className="shrink-0 rounded-md border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-accent-ink transition hover:bg-accent/20 disabled:opacity-40"
          disabled={!input.trim()}
          onClick={add}
          type="button"
        >
          {addLabel}
        </button>
      </div>

      {keywords.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-2 text-xs font-medium",
                tone === "priority"
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
                  : "border-accent/30 bg-accent/10 text-accent-ink",
              )}
              key={keyword}
            >
              {keyword}
              <button
                aria-label={`Remove ${keyword}`}
                className="flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-tint/10"
                onClick={() => remove(keyword)}
                type="button"
              >
                x
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 break-words text-sm leading-6 text-muted-2">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}
