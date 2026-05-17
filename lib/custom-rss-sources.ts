export type CustomRssSourceType = "rss" | "youtube";
export type CustomRssSourceLanguage = "ko" | "en" | "mixed";
export type CustomRssSourceRegion = "US" | "Korea" | "Global";
export type CustomRssSourceMarketType =
  | "Stocks"
  | "ETFs"
  | "Earnings"
  | "Macro"
  | "Economy"
  | "Indices";
export type CustomRssCreatorCategory =
  | "Research"
  | "Macro"
  | "Bitcoin"
  | "Ethereum"
  | "Solana"
  | "Security"
  | "AI & Crypto";
export type CustomRssSourceCategory =
  | "Crypto"
  | "SNS"
  | "Stock Market"
  | "Other"
  | CustomRssCreatorCategory;

export type CustomRssSource = {
  id: string;
  name: string;
  url: string;
  type: CustomRssSourceType;
  language: CustomRssSourceLanguage;
  category: CustomRssSourceCategory;
  customCategory?: string;
  marketType?: CustomRssSourceMarketType;
  region?: CustomRssSourceRegion;
  tickerSymbol?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomRssSourceInput = Pick<
  CustomRssSource,
  | "name"
  | "url"
  | "type"
  | "language"
  | "category"
  | "customCategory"
  | "marketType"
  | "region"
  | "tickerSymbol"
  | "enabled"
>;

export const CUSTOM_RSS_SOURCES_STORAGE_KEY = "chain-brief-custom-rss-sources";
const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/;
const YOUTUBE_FEED_PATH = "/feeds/videos.xml";

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
  const customCategory = input.customCategory?.trim().slice(0, 40) || undefined;
  return {
    name: input.name.trim().slice(0, 80),
    url: input.url.trim(),
    type: input.type === "youtube" ? "youtube" : "rss",
    language:
      input.language === "ko" || input.language === "en" ? input.language : "mixed",
    category: normalizeCategory(input.category),
    customCategory,
    marketType: normalizeMarketType(input.marketType),
    region: normalizeRegion(input.region),
    tickerSymbol: input.tickerSymbol?.trim().toUpperCase().slice(0, 16) || undefined,
    enabled: Boolean(input.enabled),
  };
}

export function createYouTubeChannelFeedUrl(channelId: string) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

export function getYouTubeFeedUrlFromUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, "");

    if (
      (host !== "youtube.com" && host !== "m.youtube.com") ||
      url.pathname !== YOUTUBE_FEED_PATH
    ) {
      return null;
    }

    const channelId = url.searchParams.get("channel_id");
    const playlistId = url.searchParams.get("playlist_id");
    const user = url.searchParams.get("user");

    if (
      (channelId && YOUTUBE_CHANNEL_ID_PATTERN.test(channelId)) ||
      Boolean(playlistId?.trim()) ||
      Boolean(user?.trim())
    ) {
      url.hostname = "www.youtube.com";
      url.protocol = "https:";
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

export function getYouTubeChannelIdFromUrl(value: string) {
  const trimmed = value.trim();

  if (YOUTUBE_CHANNEL_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const channelId = url.searchParams.get("channel_id");

    if (channelId && YOUTUBE_CHANNEL_ID_PATTERN.test(channelId)) {
      return channelId;
    }

    const channelMatch = url.pathname.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/);
    return channelMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isLikelyYouTubeChannelInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("@") || YOUTUBE_CHANNEL_ID_PATTERN.test(trimmed)) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    );
  } catch {
    return false;
  }
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
    category: normalizeCategory(source.category),
    customCategory:
      typeof source.customCategory === "string" ? source.customCategory : undefined,
    marketType: normalizeMarketType(source.marketType),
    region: normalizeRegion(source.region),
    tickerSymbol:
      typeof source.tickerSymbol === "string" ? source.tickerSymbol : undefined,
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

function normalizeCategory(value: unknown): CustomRssSourceCategory {
  return value === "Stock Market" ||
    value === "SNS" ||
    value === "Other" ||
    value === "Research" ||
    value === "Macro" ||
    value === "Bitcoin" ||
    value === "Ethereum" ||
    value === "Solana" ||
    value === "Security" ||
    value === "AI & Crypto"
    ? value
    : "Crypto";
}

function normalizeMarketType(value: unknown): CustomRssSourceMarketType | undefined {
  return value === "Stocks" ||
    value === "ETFs" ||
    value === "Earnings" ||
    value === "Macro" ||
    value === "Economy" ||
    value === "Indices"
    ? value
    : undefined;
}

function normalizeRegion(value: unknown): CustomRssSourceRegion | undefined {
  return value === "US" || value === "Korea" || value === "Global"
    ? value
    : undefined;
}
