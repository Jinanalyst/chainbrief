export type CustomRssSourceType = "rss" | "youtube";
export type CustomRssSourceLanguage = "ko" | "en" | "mixed";

export type CustomRssSource = {
  id: string;
  name: string;
  url: string;
  type: CustomRssSourceType;
  language: CustomRssSourceLanguage;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomRssSourceInput = Pick<
  CustomRssSource,
  "name" | "url" | "type" | "language" | "enabled"
>;

export const CUSTOM_RSS_SOURCES_STORAGE_KEY = "chain-brief-custom-rss-sources";

export function readCustomRssSources(): CustomRssSource[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(CUSTOM_RSS_SOURCES_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeStoredSource)
      .filter((source): source is CustomRssSource => Boolean(source));
  } catch {
    return [];
  }
}

export function writeCustomRssSources(sources: CustomRssSource[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CUSTOM_RSS_SOURCES_STORAGE_KEY,
    JSON.stringify(sources),
  );
  window.dispatchEvent(new CustomEvent("chain-brief-custom-rss-sources-changed"));
}

export function normalizeCustomRssSources(value: unknown): CustomRssSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeStoredSource)
    .filter((source): source is CustomRssSource => Boolean(source));
}

export function createCustomRssSource(input: CustomRssSourceInput): CustomRssSource {
  const now = new Date().toISOString();

  return {
    ...sanitizeCustomRssSourceInput(input),
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCustomRssSource(
  source: CustomRssSource,
  input: CustomRssSourceInput,
): CustomRssSource {
  return {
    ...source,
    ...sanitizeCustomRssSourceInput(input),
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeCustomRssSourceInput(
  input: CustomRssSourceInput,
): CustomRssSourceInput {
  return {
    name: input.name.trim().slice(0, 80),
    url: input.url.trim(),
    type: input.type === "youtube" ? "youtube" : "rss",
    language:
      input.language === "ko" || input.language === "en" ? input.language : "mixed",
    enabled: Boolean(input.enabled),
  };
}

export function isValidRssUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeStoredSource(value: unknown): CustomRssSource | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<CustomRssSource>;
  const input = sanitizeCustomRssSourceInput({
    name: typeof source.name === "string" ? source.name : "",
    url: typeof source.url === "string" ? source.url : "",
    type: source.type === "youtube" ? "youtube" : "rss",
    language:
      source.language === "ko" || source.language === "en"
        ? source.language
        : "mixed",
    enabled: source.enabled !== false,
  });

  if (!input.name || !isValidRssUrl(input.url)) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    ...input,
    id: typeof source.id === "string" ? source.id : `custom-${now}`,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
  };
}
