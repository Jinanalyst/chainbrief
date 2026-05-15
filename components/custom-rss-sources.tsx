"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  createCustomRssSource,
  createYouTubeChannelFeedUrl,
  getYouTubeChannelIdFromUrl,
  getYouTubeFeedUrlFromUrl,
  isLikelyYouTubeChannelInput,
  isValidRssUrl,
  normalizeCustomRssSources,
  readCustomRssSources,
  updateCustomRssSource,
  writeCustomRssSources,
  type CustomRssCreatorCategory,
  type CustomRssSource,
  type CustomRssSourceInput,
} from "@/lib/custom-rss-sources";
import type { BriefPreferences } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type CustomRssSourcesProps = {
  language: BriefPreferences["language"];
};

type CustomRssCopy = {
  add: string;
  cancel: string;
  category: string;
  customCategory: string;
  customCategoryPlaceholder: string;
  delete: string;
  description: string;
  disabled: string;
  edit: string;
  enabled: string;
  empty: string;
  feedCategoryCrypto: string;
  feedCategoryOther: string;
  feedCategorySns: string;
  feedCategoryStock: string;
  language: string;
  marketType: string;
  mixed: string;
  name: string;
  namePlaceholder: string;
  normalRss: string;
  region: string;
  rssUrl: string;
  resolving: string;
  save: string;
  sourceType: string;
  tickerPlaceholder: string;
  tickerSymbol: string;
  title: string;
  urlInvalid: string;
  urlPlaceholder: string;
  youtube: string;
  youtubeHelp: string;
  youtubeInvalid: string;
};

const EMPTY_FORM: CustomRssSourceInput = {
  name: "",
  url: "",
  type: "rss",
  language: "mixed",
  category: "Crypto",
  customCategory: "",
  marketType: undefined,
  region: undefined,
  tickerSymbol: "",
  enabled: true,
};

const FEED_CATEGORIES = ["Crypto", "Stock Market", "SNS", "Other"] as const;
const CREATOR_CATEGORIES = [
  "Research",
  "Macro",
  "Bitcoin",
  "Ethereum",
  "Solana",
  "Security",
  "AI & Crypto",
] as const satisfies readonly CustomRssCreatorCategory[];
const MARKET_TYPES = ["Stocks", "ETFs", "Earnings", "Macro", "Economy", "Indices"] as const;
const REGIONS = ["US", "Korea", "Global"] as const;

function getCopy(language: BriefPreferences["language"]): CustomRssCopy {
  if (language === "ko") {
    return {
      add: "소스 추가",
      cancel: "취소",
      category: "카테고리",
      customCategory: "커스텀 탭 라벨",
      customCategoryPlaceholder: "예: 한국주식, 매크로뉴스",
      delete: "삭제",
      description:
        "크립토, SNS, 주식 시장 RSS 피드를 추가하세요. 주식 소스에는 지역, 유형, 티커 메타데이터를 붙여 개인 브리프에 표시할 수 있습니다.",
      disabled: "꺼짐",
      edit: "수정",
      enabled: "켜짐",
      empty: "아직 추가한 커스텀 RSS 소스가 없습니다.",
      feedCategoryCrypto: "Crypto",
      feedCategoryOther: "Other",
      feedCategorySns: "SNS",
      feedCategoryStock: "Stock Market",
      language: "언어",
      marketType: "시장 유형",
      mixed: "혼합",
      name: "소스 이름",
      namePlaceholder: "예: CNBC Markets, Naver Finance, ETF.com",
      normalRss: "일반 RSS",
      region: "지역",
      rssUrl: "RSS or channel URL",
      resolving: "YouTube 채널 확인 중...",
      save: "저장",
      sourceType: "소스 타입",
      tickerPlaceholder: "AAPL, 005930, SPY",
      tickerSymbol: "티커 심볼",
      title: "Custom RSS Sources",
      urlInvalid: "올바른 http 또는 https RSS URL을 입력해 주세요.",
      urlPlaceholder: "https://example.com/feed.xml",
      youtube: "YouTube RSS",
      youtubeHelp:
        "YouTube 채널 URL, @handle URL, 채널 ID 또는 YouTube RSS 피드 URL을 붙여넣으세요.",
      youtubeInvalid:
        "올바른 YouTube 채널 URL, @handle URL, 채널 ID 또는 RSS 피드 URL을 입력해 주세요.",
    };
  }

  return {
    add: "Add Source",
    cancel: "Cancel",
    category: "Category",
    customCategory: "Custom tab label",
    customCategoryPlaceholder: "e.g. Korean Stocks, Macro News",
    delete: "Delete",
    description:
      "Add crypto, SNS, or stock market RSS feeds. Stock sources can include region, type, and ticker metadata for your personalized brief.",
    disabled: "Off",
    edit: "Edit",
    enabled: "On",
    empty: "No custom RSS sources yet.",
    feedCategoryCrypto: "Crypto",
    feedCategoryOther: "Other",
    feedCategorySns: "SNS",
    feedCategoryStock: "Stock Market",
    language: "Language",
    marketType: "Market type",
    mixed: "Mixed",
    name: "Source name",
    namePlaceholder: "Ex: CNBC Markets, Naver Finance, ETF.com",
    normalRss: "Normal RSS",
    region: "Region",
    rssUrl: "RSS or channel URL",
    resolving: "Resolving YouTube channel...",
    save: "Save",
    sourceType: "Source type",
    tickerPlaceholder: "AAPL, 005930, SPY",
    tickerSymbol: "Ticker symbol",
    title: "Custom RSS Sources",
    urlInvalid: "Enter a valid http or https RSS URL.",
    urlPlaceholder: "https://example.com/feed.xml",
    youtube: "YouTube RSS",
    youtubeHelp:
      "Paste a YouTube channel URL, @handle URL, channel ID, or YouTube RSS feed URL.",
    youtubeInvalid:
      "Enter a valid YouTube channel URL, @handle URL, channel ID, or RSS feed URL.",
  };
}

async function resolveYouTubeSource(value: string) {
  const feedUrl = getYouTubeFeedUrlFromUrl(value);

  if (feedUrl) {
    return { feedUrl, title: null as string | null };
  }

  const channelId = getYouTubeChannelIdFromUrl(value);

  if (channelId) {
    return { feedUrl: createYouTubeChannelFeedUrl(channelId), title: null as string | null };
  }

  try {
    const response = await fetch("/api/custom-rss/resolve-youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: value }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      feedUrl?: string;
      title?: string | null;
    };

    return data.feedUrl
      ? { feedUrl: data.feedUrl, title: data.title ?? null }
      : null;
  } catch {
    return null;
  }
}

export function CustomRssSources({ language }: CustomRssSourcesProps) {
  const copy = getCopy(language);
  const [sources, setSources] = useState<CustomRssSource[]>([]);
  const [form, setForm] = useState<CustomRssSourceInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const enabledCount = useMemo(
    () => sources.filter((source) => source.enabled).length,
    [sources],
  );
  const isStockSource = form.category === "Stock Market";
  const categoryOptions =
    form.type === "youtube" ? CREATOR_CATEGORIES : FEED_CATEGORIES;

  useEffect(() => {
    if (!supabase) {
      const timer = window.setTimeout(() => {
        setSources(readCustomRssSources());
      }, 0);

      return () => window.clearTimeout(timer);
    }

    supabase.auth.getUser().then(({ data }) => {
      const nextUser = data.user;
      setUser(nextUser);

      const userSources = normalizeCustomRssSources(
        nextUser?.user_metadata?.custom_rss_sources,
      );
      setSources(userSources.length > 0 ? userSources : readCustomRssSources());
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      const userSources = normalizeCustomRssSources(
        nextUser?.user_metadata?.custom_rss_sources,
      );
      setSources(userSources.length > 0 ? userSources : readCustomRssSources());
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  function persist(nextSources: CustomRssSource[]) {
    setSources(nextSources);
    writeCustomRssSources(nextSources);

    if (supabase && user) {
      void supabase.auth.updateUser({
        data: { custom_rss_sources: nextSources },
      });
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  }

  async function submitSource() {
    const trimmedName = form.name.trim();
    const trimmedUrl = form.url.trim();
    let nextForm = {
      ...form,
      marketType: form.category === "Stock Market" ? form.marketType : undefined,
      region: form.category === "Stock Market" ? form.region : undefined,
      tickerSymbol: form.category === "Stock Market" ? form.tickerSymbol : "",
    };

    if (form.type === "youtube") {
      if (!isLikelyYouTubeChannelInput(trimmedUrl)) {
        setError(copy.youtubeInvalid);
        return;
      }

      setResolving(true);
      setError(null);

      const resolved = await resolveYouTubeSource(trimmedUrl);
      setResolving(false);

      if (!resolved) {
        setError(copy.youtubeInvalid);
        return;
      }

      nextForm = {
        ...nextForm,
        name: trimmedName || resolved.title || "YouTube Channel",
        url: resolved.feedUrl,
        type: "youtube",
      };
    } else if (!trimmedName || !isValidRssUrl(trimmedUrl)) {
      setError(copy.urlInvalid);
      return;
    }

    if (editingId) {
      persist(
        sources.map((source) =>
          source.id === editingId ? updateCustomRssSource(source, nextForm) : source,
        ),
      );
    } else {
      persist([createCustomRssSource(nextForm), ...sources]);
    }

    resetForm();
  }

  function startEdit(source: CustomRssSource) {
    const sourceTypeUpdate = getSourceTypeFormUpdate(source.type, source.category);

    setEditingId(source.id);
    setForm({
      name: source.name,
      url: source.url,
      type: sourceTypeUpdate.type,
      language: source.language,
      category: sourceTypeUpdate.category,
      customCategory: source.customCategory ?? "",
      marketType: source.marketType,
      region: source.region,
      tickerSymbol: source.tickerSymbol ?? "",
      enabled: source.enabled,
    });
    setError(null);
  }

  function toggleSource(sourceId: string) {
    persist(
      sources.map((source) =>
        source.id === sourceId
          ? { ...source, enabled: !source.enabled, updatedAt: new Date().toISOString() }
          : source,
      ),
    );
  }

  function deleteSource(sourceId: string) {
    persist(sources.filter((source) => source.id !== sourceId));

    if (editingId === sourceId) {
      resetForm();
    }
  }

  return (
    <section className="mt-4 min-w-0 rounded-lg border border-white/10 bg-background/60 p-3 sm:p-4">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {copy.title}
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-muted">
              {copy.description}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-blue-100">
            {enabledCount}/{sources.length} {copy.enabled}
          </span>
        </div>

        <div className="mt-4 grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 md:grid-cols-2">
          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {copy.name}
            </span>
            <input
              className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder={copy.namePlaceholder}
              value={form.name}
            />
          </label>

          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {copy.rssUrl}
            </span>
            <input
              className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) => {
                const nextUrl = event.target.value;

                setForm({
                  ...form,
                  url: nextUrl,
                  ...getSourceTypeFormUpdate(
                    form.type === "rss" && isLikelyYouTubeChannelInput(nextUrl)
                      ? "youtube"
                      : form.type,
                    form.category,
                  ),
                });
              }}
              placeholder={
                form.type === "youtube"
                  ? "https://www.youtube.com/@Bankless or https://www.youtube.com/feeds/videos.xml?channel_id=..."
                  : copy.urlPlaceholder
              }
              value={form.url}
            />
            {form.type === "youtube" ? (
              <p className="mt-2 text-xs leading-5 text-muted-2">{copy.youtubeHelp}</p>
            ) : null}
          </label>

          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {copy.sourceType}
            </span>
            <select
              className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) =>
                setForm({
                  ...form,
                  ...getSourceTypeFormUpdate(event.target.value, form.category),
                })
              }
              value={form.type}
            >
              <option value="rss">{copy.normalRss}</option>
              <option value="youtube">{copy.youtube}</option>
            </select>
          </label>

          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {copy.category}
            </span>
            <select
              className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) =>
                setForm({
                  ...form,
                  category: event.target.value as CustomRssSourceInput["category"],
                })
              }
              value={form.category}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {getFeedCategoryLabel(category, copy)}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {copy.customCategory}
            </span>
            <input
              className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
              maxLength={40}
              onChange={(event) =>
                setForm({ ...form, customCategory: event.target.value })
              }
              placeholder={copy.customCategoryPlaceholder}
              value={form.customCategory ?? ""}
            />
          </label>

          {isStockSource ? (
            <>
              <label className="block min-w-0">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {copy.marketType}
                </span>
                <select
                  className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  onChange={(event) =>
                    setForm({
                      ...form,
                      marketType:
                        event.target.value === ""
                          ? undefined
                          : (event.target.value as CustomRssSourceInput["marketType"]),
                    })
                  }
                  value={form.marketType ?? ""}
                >
                  <option value="">Any</option>
                  {MARKET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {copy.region}
                </span>
                <select
                  className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  onChange={(event) =>
                    setForm({
                      ...form,
                      region:
                        event.target.value === ""
                          ? undefined
                          : (event.target.value as CustomRssSourceInput["region"]),
                    })
                  }
                  value={form.region ?? ""}
                >
                  <option value="">Any</option>
                  {REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {copy.tickerSymbol}
                </span>
                <input
                  className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                  onChange={(event) =>
                    setForm({ ...form, tickerSymbol: event.target.value })
                  }
                  placeholder={copy.tickerPlaceholder}
                  value={form.tickerSymbol ?? ""}
                />
              </label>
            </>
          ) : null}

          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {copy.language}
            </span>
            <select
              className="mt-2 min-h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              onChange={(event) =>
                setForm({
                  ...form,
                  language:
                    event.target.value === "ko" || event.target.value === "en"
                      ? event.target.value
                      : "mixed",
                })
              }
              value={form.language}
            >
              <option value="mixed">{copy.mixed}</option>
              <option value="ko">Korean</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-muted">
            <input
              checked={form.enabled}
              className="h-4 w-4 accent-blue-500"
              onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              type="checkbox"
            />
            {copy.enabled}
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Button
              className="w-full sm:w-auto"
              disabled={resolving}
              onClick={submitSource}
              type="button"
            >
              {resolving ? copy.resolving : editingId ? copy.save : copy.add}
            </Button>
            {editingId ? (
              <Button
                className="w-full sm:w-auto"
                onClick={resetForm}
                type="button"
                variant="secondary"
              >
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
                    <p className="truncate text-sm font-semibold text-ink">
                      {source.name}
                    </p>
                    <SourcePill>
                      {source.type === "youtube" ? copy.youtube : copy.normalRss}
                    </SourcePill>
                    <SourcePill>{getFeedCategoryLabel(source.category, copy)}</SourcePill>
                    {source.customCategory ? (
                      <SourcePill>{source.customCategory}</SourcePill>
                    ) : null}
                    {source.region ? <SourcePill>{source.region}</SourcePill> : null}
                    {source.marketType ? <SourcePill>{source.marketType}</SourcePill> : null}
                    {source.tickerSymbol ? <SourcePill>{source.tickerSymbol}</SourcePill> : null}
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]",
                        source.enabled
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-white/[0.03] text-muted-2",
                      )}
                    >
                      {source.enabled ? copy.enabled : copy.disabled}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-2">{source.url}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/50 hover:text-ink"
                    onClick={() => toggleSource(source.id)}
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
                    onClick={() => deleteSource(source.id)}
                    type="button"
                  >
                    {copy.delete}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function SourcePill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </span>
  );
}

function getFeedCategoryLabel(
  category: CustomRssSourceInput["category"],
  copy: CustomRssCopy,
) {
  if (category === "Stock Market") return copy.feedCategoryStock;
  if (category === "SNS") return copy.feedCategorySns;
  if (category === "Other") return copy.feedCategoryOther;
  if (isCreatorCategory(category)) return category;
  return copy.feedCategoryCrypto;
}

function getSourceTypeFormUpdate(
  value: string,
  category: CustomRssSourceInput["category"],
): Pick<CustomRssSourceInput, "type" | "category"> {
  const type = value === "youtube" ? "youtube" : "rss";

  if (type === "youtube") {
    return {
      type,
      category: isCreatorCategory(category) ? category : "Research",
    };
  }

  return {
    type,
    category: isFeedCategory(category) ? category : "Crypto",
  };
}

function isCreatorCategory(
  category: CustomRssSourceInput["category"],
): category is CustomRssCreatorCategory {
  return CREATOR_CATEGORIES.includes(category as CustomRssCreatorCategory);
}

function isFeedCategory(
  category: CustomRssSourceInput["category"],
): category is (typeof FEED_CATEGORIES)[number] {
  return FEED_CATEGORIES.includes(category as (typeof FEED_CATEGORIES)[number]);
}
