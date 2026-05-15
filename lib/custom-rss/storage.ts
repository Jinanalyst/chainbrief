"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { CUSTOM_RSS_STORAGE_KEY, type CustomRssSource } from "@/lib/custom-rss/types";

type SourceRow = {
  id: string;
  name: string;
  url: string;
  source_type: CustomRssSource["type"];
  language: CustomRssSource["language"];
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export function createCustomRssSource(
  values?: Partial<Pick<CustomRssSource, "name" | "url" | "type" | "language">>,
): CustomRssSource {
  const now = new Date().toISOString();

  return {
    id: createClientId(),
    name: values?.name?.trim() ?? "",
    url: values?.url?.trim() ?? "",
    type: values?.type ?? "rss",
    language: values?.language ?? "multi",
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function readLocalCustomRssSources(): CustomRssSource[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CUSTOM_RSS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeSource).filter(Boolean) as CustomRssSource[];
  } catch {
    return [];
  }
}

export function writeLocalCustomRssSources(sources: CustomRssSource[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CUSTOM_RSS_STORAGE_KEY, JSON.stringify(sources));
  window.dispatchEvent(new Event("chainbrief:custom-rss-sources-changed"));
}

export async function loadCustomRssSources(
  supabase: SupabaseClient | null,
): Promise<{ sources: CustomRssSource[]; user: User | null; storage: "supabase" | "local" }> {
  const localSources = readLocalCustomRssSources();

  if (!supabase) {
    return { sources: localSources, user: null, storage: "local" };
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return { sources: localSources, user: null, storage: "local" };
  }

  try {
    const { data, error } = await supabase
      .from("custom_rss_sources")
      .select("id,name,url,source_type,language,enabled,created_at,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return {
      sources: (data ?? []).map(rowToSource),
      user,
      storage: "supabase",
    };
  } catch {
    return { sources: localSources, user, storage: "local" };
  }
}

export async function saveCustomRssSources(
  sources: CustomRssSource[],
  supabase: SupabaseClient | null,
  user: User | null,
) {
  writeLocalCustomRssSources(sources);

  if (!supabase || !user) {
    return "local" as const;
  }

  try {
    const rows = sources.map((source) => sourceToRow(source, user.id));

    const { error: deleteError } = await supabase
      .from("custom_rss_sources")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      throw deleteError;
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("custom_rss_sources")
        .upsert(rows);

      if (insertError) {
        throw insertError;
      }
    }

    return "supabase" as const;
  } catch {
    return "local" as const;
  }
}

function sourceToRow(source: CustomRssSource, userId: string) {
  return {
    id: source.id,
    user_id: userId,
    name: source.name,
    url: source.url,
    source_type: source.type,
    language: source.language,
    enabled: source.enabled,
    created_at: source.createdAt,
    updated_at: source.updatedAt,
  };
}

function rowToSource(row: SourceRow): CustomRssSource {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    type: row.source_type,
    language: row.language,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSource(value: unknown): CustomRssSource | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<CustomRssSource>;
  const now = new Date().toISOString();
  const type = source.type === "youtube" ? "youtube" : "rss";
  const language =
    source.language === "en" || source.language === "ko" || source.language === "multi"
      ? source.language
      : "multi";

  if (!source.id || !source.name || !source.url) {
    return null;
  }

  return {
    id: source.id,
    name: source.name,
    url: source.url,
    type,
    language,
    enabled: source.enabled !== false,
    createdAt: source.createdAt ?? now,
    updatedAt: source.updatedAt ?? now,
  };
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
