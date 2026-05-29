"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  ACTIVE_SOURCES,
  BRIEF_CATEGORIES,
  type BriefPreferences,
} from "@/lib/preferences";
import { usePreferences } from "@/lib/i18n/use-i18n";
import {
  CUSTOM_BRIEF_CATEGORIES_CHANGED_EVENT,
  addCustomBriefCategory,
  readCustomBriefCategories,
  removeCustomBriefCategory,
} from "@/lib/custom-brief-categories";

const SOURCE_GROUPS: { id: string; labelKo: string; labelEn: string; sources: string[] }[] = [
  {
    id: "crypto",
    labelKo: "크립토",
    labelEn: "Crypto",
    sources: ["CoinDesk", "Cointelegraph", "Decrypt", "블록미디어"],
  },
  {
    id: "domestic",
    labelKo: "국내",
    labelEn: "Korea",
    sources: ["매일경제", "한국경제", "이투데이", "연합뉴스"],
  },
  {
    id: "official",
    labelKo: "공식",
    labelEn: "Official",
    sources: ["한국은행", "국토교통부"],
  },
];

const REFRESH_OPTIONS: { value: number | null; labelKo: string; labelEn: string }[] = [
  { value: 60 * 1000, labelKo: "1분", labelEn: "1 min" },
  { value: 5 * 60 * 1000, labelKo: "5분", labelEn: "5 min" },
  { value: 10 * 60 * 1000, labelKo: "10분", labelEn: "10 min" },
  { value: null, labelKo: "수동", labelEn: "Manual" },
];

type LanguagePref = BriefPreferences["language"] | "all";

function categoryLabel(category: string, lang: LanguagePref) {
  const ko: Record<string, string> = {
    All: "전체",
    "가상자산": "가상자산",
    Macro: "매크로",
    "국내증시": "국내증시",
    "부동산": "부동산",
  };
  const en: Record<string, string> = {
    All: "All",
    "가상자산": "Crypto",
    Macro: "Macro",
    "국내증시": "Korean Stocks",
    "부동산": "Real Estate",
  };
  return (lang === "en" ? en : ko)[category] ?? category;
}

export function BriefsFixedSidebar() {
  const [preferences, setPreferences] = usePreferences();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    const width = collapsed ? "44px" : "220px";
    document.documentElement.style.setProperty("--briefs-sidebar-width", width);
    return () => {
      document.documentElement.style.removeProperty("--briefs-sidebar-width");
    };
  }, [collapsed]);

  useEffect(() => {
    function sync() {
      setCustomCategories(readCustomBriefCategories());
    }
    sync();
    window.addEventListener(CUSTOM_BRIEF_CATEGORIES_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(CUSTOM_BRIEF_CATEGORIES_CHANGED_EVENT, sync);
    };
  }, []);
  const lang: LanguagePref = preferences.language;

  const allKnownSources = useMemo(
    () => Array.from(new Set([...ACTIVE_SOURCES, ...SOURCE_GROUPS.flatMap((g) => g.sources)])),
    [],
  );

  const allSourcesSelected = allKnownSources.every((s) => preferences.sources.includes(s));

  function selectCategory(category: string) {
    setPreferences({ ...preferences, category });
  }

  const allCategories = useMemo(() => {
    const base = BRIEF_CATEGORIES;
    return [...base, ...customCategories.filter((c) => !base.includes(c))];
  }, [customCategories]);

  function handleAddCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const next = addCustomBriefCategory(trimmed);
    setCustomCategories(next);
    setNewCategoryName("");
    setShowAddCategory(false);
    setPreferences({ ...preferences, category: trimmed });
  }

  function handleRemoveCategory(name: string) {
    const next = removeCustomBriefCategory(name);
    setCustomCategories(next);
    if (preferences.category === name) {
      setPreferences({ ...preferences, category: "All" });
    }
  }

  function toggleSource(source: string) {
    const has = preferences.sources.includes(source);
    const next = has
      ? preferences.sources.filter((s) => s !== source)
      : [...preferences.sources, source];
    setPreferences({
      ...preferences,
      sources: next.length > 0 ? next : allKnownSources,
    });
  }

  function setRefreshInterval(value: number | null) {
    setPreferences({ ...preferences, refreshIntervalMs: value });
  }

  function setLanguage(value: LanguagePref) {
    if (value === "all") {
      setPreferences({ ...preferences, language: "ko" });
      return;
    }
    setPreferences({ ...preferences, language: value });
  }

  const labelOf = (ko: string, en: string) => (lang === "en" ? en : ko);

  return (
    <>
      {/* Mobile open button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 left-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-tint/15 bg-surface/95 px-4 text-xs font-bold text-ink shadow-lg backdrop-blur lg:hidden"
        aria-label={labelOf("필터 열기", "Open filters")}
      >
        <span aria-hidden>☰</span>
        <span>{labelOf("필터", "Filters")}</span>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label={labelOf("닫기", "Close")}
        />
      ) : null}

      <aside
        className={cn(
          "border-r border-tint/10 bg-surface/80 backdrop-blur",
          "lg:fixed lg:left-0 lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0",
          "fixed left-0 top-0 z-50 h-screen w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{ ["--sb-w" as string]: collapsed ? "44px" : "220px" }}
        data-collapsed={collapsed}
        aria-label={labelOf("브리프 사이드바", "Briefs sidebar")}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              "flex items-center border-b border-tint/10 px-2 py-3",
              collapsed ? "lg:justify-center" : "justify-between",
            )}
          >
            {!collapsed ? (
              <span className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {labelOf("필터", "Filters")}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-tint/10 bg-tint/[0.04] text-muted transition hover:text-ink lg:inline-flex"
              aria-label={
                collapsed
                  ? labelOf("사이드바 펼치기", "Expand sidebar")
                  : labelOf("사이드바 접기", "Collapse sidebar")
              }
              title={
                collapsed
                  ? labelOf("펼치기", "Expand")
                  : labelOf("접기", "Collapse")
              }
            >
              <span aria-hidden>{collapsed ? "›" : "‹"}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-tint/10 bg-tint/[0.04] text-muted lg:hidden"
              aria-label={labelOf("닫기", "Close")}
            >
              <span aria-hidden>✕</span>
            </button>
          </div>

          {collapsed ? (
            <div className="hidden flex-1 flex-col items-center gap-3 py-3 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted lg:flex">
              <span title={labelOf("카테고리", "Categories")} aria-hidden>
                C
              </span>
              <span title={labelOf("소스", "Sources")} aria-hidden>
                S
              </span>
              <span title={labelOf("설정", "Settings")} aria-hidden>
                ⚙
              </span>
            </div>
          ) : (
            <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
              {/* Categories */}
              <section>
                <h3 className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">
                  {labelOf("카테고리", "Categories")}
                </h3>
                <div role="radiogroup" className="grid gap-1">
                  {allCategories.map((category) => {
                    const active = preferences.category === category;
                    const isCustom = !BRIEF_CATEGORIES.includes(category);
                    return (
                      <label
                        key={category}
                        className={cn(
                          "group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm font-medium transition",
                          active
                            ? "border-accent/60 bg-accent/15 text-accent-ink"
                            : "border-transparent text-muted hover:border-tint/10 hover:bg-tint/[0.04] hover:text-ink",
                        )}
                      >
                        <input
                          type="radio"
                          name="brief-category"
                          className="h-3.5 w-3.5 accent-accent"
                          checked={active}
                          onChange={() => selectCategory(category)}
                        />
                        <span className="flex-1 truncate">
                          {isCustom ? category : categoryLabel(category, lang)}
                        </span>
                        {isCustom ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              handleRemoveCategory(category);
                            }}
                            className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-xs text-muted-2 opacity-0 transition hover:bg-tint/10 hover:text-ink group-hover:opacity-100"
                            aria-label={labelOf(`${category} 삭제`, `Remove ${category}`)}
                            title={labelOf("삭제", "Remove")}
                          >
                            <span aria-hidden>×</span>
                          </button>
                        ) : null}
                      </label>
                    );
                  })}
                </div>

                {showAddCategory ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={newCategoryName}
                      onChange={(event) => setNewCategoryName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddCategory();
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          setNewCategoryName("");
                          setShowAddCategory(false);
                        }
                      }}
                      placeholder={labelOf("새 카테고리", "New category")}
                      className="min-w-0 flex-1 rounded-md border border-tint/15 bg-background px-2 py-1.5 text-xs font-medium text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                      maxLength={40}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                      className="inline-flex h-7 items-center justify-center rounded-md border border-accent/40 bg-accent/15 px-2.5 text-xs font-bold text-accent-ink transition hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {labelOf("추가", "Add")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(true)}
                    className="mt-2 flex w-full items-center gap-2 rounded-md border border-dashed border-tint/20 px-2 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent/5 hover:text-accent-ink"
                  >
                    <span aria-hidden className="text-base leading-none">+</span>
                    <span>{labelOf("카테고리 추가", "Add category")}</span>
                  </button>
                )}
              </section>

              {/* Sources */}
              <section>
                <h3 className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">
                  {labelOf("소스", "Sources")}
                </h3>
                <div className="space-y-3">
                  {SOURCE_GROUPS.map((group) => (
                    <div key={group.id}>
                      <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-2/80">
                        {labelOf(group.labelKo, group.labelEn)}
                      </p>
                      <div className="grid gap-1">
                        {group.sources.map((source) => {
                          const checked =
                            allSourcesSelected || preferences.sources.includes(source);
                          return (
                            <label
                              key={source}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-ink transition hover:bg-tint/[0.04]"
                            >
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 accent-accent"
                                checked={checked}
                                onChange={() => toggleSource(source)}
                              />
                              <span className="truncate">{source}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Settings */}
              <section>
                <h3 className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">
                  {labelOf("설정", "Settings")}
                </h3>
                <div className="grid gap-3">
                  <label className="grid gap-1 text-xs font-semibold text-muted">
                    <span>{labelOf("새로고침 주기", "Refresh")}</span>
                    <select
                      className="min-h-9 rounded-md border border-tint/10 bg-background px-2 text-xs font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                      value={
                        preferences.refreshIntervalMs === null
                          ? "manual"
                          : String(preferences.refreshIntervalMs)
                      }
                      onChange={(event) => {
                        const v = event.target.value;
                        setRefreshInterval(v === "manual" ? null : Number(v));
                      }}
                    >
                      {REFRESH_OPTIONS.map((option) => (
                        <option
                          key={option.value ?? "manual"}
                          value={option.value === null ? "manual" : String(option.value)}
                        >
                          {labelOf(option.labelKo, option.labelEn)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-xs font-semibold text-muted">
                    <span>{labelOf("언어", "Language")}</span>
                    <select
                      className="min-h-9 rounded-md border border-tint/10 bg-background px-2 text-xs font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                      value={preferences.language}
                      onChange={(event) =>
                        setLanguage(event.target.value as LanguagePref)
                      }
                    >
                      <option value="ko">{labelOf("한국어", "Korean")}</option>
                      <option value="en">English</option>
                      <option value="all">{labelOf("전체", "All")}</option>
                    </select>
                  </label>
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
