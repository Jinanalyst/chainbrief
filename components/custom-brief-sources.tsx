"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  createCustomBriefSource,
  isValidBriefSourceUrl,
  readCustomBriefSources,
  writeCustomBriefSources,
  type CustomBriefSource,
} from "@/lib/custom-brief-sources";
import type { BriefPreferences } from "@/lib/preferences";

type Props = { language: BriefPreferences["language"] };

type Copy = {
  title: string;
  description: string;
  namePlaceholder: string;
  urlPlaceholder: string;
  add: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  enabled: string;
  disabled: string;
  empty: string;
  urlInvalid: string;
  nameLabel: string;
  urlLabel: string;
  enabledBadge: string;
  disabledBadge: string;
};

function getCopy(language: BriefPreferences["language"]): Copy {
  if (language === "ko") {
    return {
      title: "커스텀 뉴스 소스",
      description:
        "유료 또는 개인 RSS 피드를 추가하면 메인 브리프 피드에 함께 표시됩니다. URL은 브라우저에만 저장됩니다.",
      namePlaceholder: "예: The Block Pro, Messari",
      urlPlaceholder: "https://example.com/feed.xml",
      add: "소스 추가",
      save: "저장",
      cancel: "취소",
      delete: "삭제",
      edit: "수정",
      enabled: "켜짐",
      disabled: "꺼짐",
      empty: "아직 추가한 커스텀 뉴스 소스가 없습니다.",
      urlInvalid: "올바른 http 또는 https RSS URL을 입력해 주세요.",
      nameLabel: "소스 이름",
      urlLabel: "RSS URL",
      enabledBadge: "활성",
      disabledBadge: "비활성",
    };
  }

  return {
    title: "Custom News Sources",
    description:
      "Add paid or private RSS feeds and they will appear in your main briefs feed. URLs are stored in your browser only.",
    namePlaceholder: "e.g. The Block Pro, Messari",
    urlPlaceholder: "https://example.com/feed.xml",
    add: "Add Source",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    enabled: "On",
    disabled: "Off",
    empty: "No custom news sources yet.",
    urlInvalid: "Enter a valid http or https RSS URL.",
    nameLabel: "Source name",
    urlLabel: "RSS URL",
    enabledBadge: "Active",
    disabledBadge: "Inactive",
  };
}

export function CustomBriefSources({ language }: Props) {
  const copy = getCopy(language);
  const [sources, setSources] = useState<CustomBriefSource[]>(() => readCustomBriefSources());
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabledCount = sources.filter((s) => s.enabled).length;

  function persist(next: CustomBriefSource[]) {
    setSources(next);
    writeCustomBriefSources(next);
  }

  function resetForm() {
    setName("");
    setUrl("");
    setEditingId(null);
    setError(null);
  }

  function submit() {
    const trimName = name.trim();
    const trimUrl = url.trim();

    if (!trimName || !isValidBriefSourceUrl(trimUrl)) {
      setError(copy.urlInvalid);
      return;
    }

    if (editingId) {
      persist(
        sources.map((s) =>
          s.id === editingId
            ? { ...s, name: trimName.slice(0, 80), url: trimUrl }
            : s,
        ),
      );
    } else {
      persist([createCustomBriefSource(trimName, trimUrl), ...sources]);
    }

    resetForm();
  }

  function startEdit(source: CustomBriefSource) {
    setEditingId(source.id);
    setName(source.name);
    setUrl(source.url);
    setError(null);
  }

  function toggle(id: string) {
    persist(sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  function remove(id: string) {
    persist(sources.filter((s) => s.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <section className="mt-4 min-w-0 rounded-lg border border-white/10 bg-background/60 p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.title}
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-muted">{copy.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-blue-100">
          {enabledCount}/{sources.length} {copy.enabled}
        </span>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 md:grid-cols-2">
        <label className="block min-w-0">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {copy.nameLabel}
          </span>
          <input
            className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={copy.namePlaceholder}
            value={name}
          />
        </label>

        <label className="block min-w-0">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {copy.urlLabel}
          </span>
          <input
            className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={copy.urlPlaceholder}
            value={url}
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end md:col-span-2">
          <Button className="w-full sm:w-auto" onClick={submit} type="button">
            {editingId ? copy.save : copy.add}
          </Button>
          {editingId ? (
            <Button className="w-full sm:w-auto" onClick={resetForm} type="button" variant="secondary">
              {copy.cancel}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-sm font-medium text-amber-200">{error}</p>
      ) : null}

      <div className="mt-4 grid gap-2">
        {sources.length === 0 ? (
          <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-3 text-sm leading-6 text-muted">
            {copy.empty}
          </p>
        ) : (
          sources.map((source) => (
            <div
              className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              key={source.id}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink">{source.name}</p>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]",
                      source.enabled
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.03] text-muted-2",
                    )}
                  >
                    {source.enabled ? copy.enabledBadge : copy.disabledBadge}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-2">{source.url}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-ink"
                  onClick={() => toggle(source.id)}
                  type="button"
                >
                  {source.enabled ? copy.disabled : copy.enabled}
                </button>
                <button
                  className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-ink"
                  onClick={() => startEdit(source)}
                  type="button"
                >
                  {copy.edit}
                </button>
                <button
                  className="rounded-md border border-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:border-rose-400/50"
                  onClick={() => remove(source.id)}
                  type="button"
                >
                  {copy.delete}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
