import Parser from "rss-parser";
import { SNS_REFRESH_SECONDS, snsSources } from "@/lib/sns/sources";
import type { SnsCategory, SnsSource, SnsVideo } from "@/lib/sns/types";

type YouTubeFeedItem = {
  title?: string;
  link?: string;
  id?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  videoId?: string;
  mediaGroup?: {
    "media:description"?: string[];
    "media:thumbnail"?: Array<{ $?: { url?: string } }>;
  };
};

const parser = new Parser<Record<string, never>, YouTubeFeedItem>({
  customFields: {
    item: [
      ["yt:videoId", "videoId"],
      ["media:group", "mediaGroup"],
    ],
  },
});

const MAX_VIDEOS = 120;
const REQUEST_TIMEOUT_MS = 9000;

export class AllSnsSourcesFailedError extends Error {
  constructor() {
    super("All SNS sources failed.");
    this.name = "AllSnsSourcesFailedError";
  }
}

export async function fetchYouTubeFeeds(): Promise<SnsVideo[]> {
  const feedResults = await Promise.allSettled(
    snsSources
      .filter((source) => source.provider === "youtube")
      .map((source) => fetchYouTubeSource(source)),
  );

  const sourceResults = feedResults.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { ok: false, videos: [] as SnsVideo[] },
  );

  if (sourceResults.every((result) => !result.ok)) {
    throw new AllSnsSourcesFailedError();
  }

  return sourceResults
    .flatMap((result) => result.videos)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, MAX_VIDEOS);
}

const YOUTUBE_RSS_USER_AGENT =
  "Mozilla/5.0 (compatible; ChainBriefBot/1.0; +https://chainbrief.app) AppleWebKit/537.36";

async function fetchYouTubeSource(
  source: SnsSource,
): Promise<{ ok: boolean; videos: SnsVideo[] }> {
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": YOUTUBE_RSS_USER_AGENT,
        Accept: "application/atom+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: {
        revalidate: SNS_REFRESH_SECONDS,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[sns] ${source.name} (${source.id}) RSS ${response.status} ${response.statusText} url=${source.url}`,
      );
      return { ok: false, videos: [] };
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);

    return {
      ok: true,
      videos: feed.items
        .map((item) => normalizeYouTubeItem(item, source))
        .filter((video): video is SnsVideo => Boolean(video)),
    };
  } catch (error) {
    console.error(
      `[sns] ${source.name} (${source.id}) fetch threw`,
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    return { ok: false, videos: [] };
  }
}

function normalizeYouTubeItem(
  item: YouTubeFeedItem,
  source: SnsSource,
): SnsVideo | null {
  const title = cleanText(item.title);
  const url = item.link;
  const videoId = item.videoId ?? parseVideoId(item.id) ?? parseVideoId(item.link);

  if (!title || !url || !videoId) {
    return null;
  }

  const description = createDescription(
    cleanText(item.mediaGroup?.["media:description"]?.[0] ?? item.contentSnippet),
  );
  const tags = createTags(title, description, source.category);
  const category = inferCategory(source.category, title, description, tags);

  return {
    id: `${source.id}-${videoId}`,
    provider: "youtube",
    sourceId: source.id,
    sourceName: source.name,
    title,
    url,
    thumbnailUrl:
      item.mediaGroup?.["media:thumbnail"]?.[0]?.$?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    publishedAt: parsePublishedAt(item.isoDate ?? item.pubDate),
    description,
    category,
    tags,
  };
}

function createTags(
  title: string,
  description: string,
  fallback: Exclude<SnsCategory, "All">,
) {
  const text = `${title} ${description}`;
  const inferredTags = [
    ["Bitcoin", /\b(bitcoin|btc|satoshi)\b/i],
    ["Ethereum", /\b(ethereum|ether|eth|devcon|evm|rollup)\b/i],
    ["Solana", /\b(solana|sol|breakpoint)\b/i],
    ["Macro", /\b(fed|rates|inflation|liquidity|dollar|macro|cycle)\b/i],
    ["Security", /\b(security|hack|exploit|wallet|scam|audit)\b/i],
    ["AI & Crypto", /\b(ai|agent|machine learning|depin)\b/i],
    ["Research", /\b(research|analysis|thesis|deep dive|data)\b/i],
  ]
    .filter(([, pattern]) => pattern instanceof RegExp && pattern.test(text))
    .map(([tag]) => tag as string);

  return Array.from(new Set([...inferredTags, fallback])).slice(0, 4);
}

function inferCategory(
  fallback: Exclude<SnsCategory, "All">,
  title: string,
  description: string,
  tags: string[],
): Exclude<SnsCategory, "All"> {
  const text = `${title} ${description} ${tags.join(" ")}`;

  if (/\b(security|hack|exploit|wallet|scam|audit)\b/i.test(text)) {
    return "Security";
  }

  if (/\b(ai|agent|machine learning|depin)\b/i.test(text)) {
    return "AI & Crypto";
  }

  if (/\b(solana|sol|breakpoint)\b/i.test(text)) {
    return "Solana";
  }

  if (/\b(ethereum|ether|eth|devcon|evm|rollup)\b/i.test(text)) {
    return "Ethereum";
  }

  if (/\b(bitcoin|btc|satoshi)\b/i.test(text)) {
    return "Bitcoin";
  }

  if (/\b(fed|rates|inflation|liquidity|dollar|macro|cycle)\b/i.test(text)) {
    return "Macro";
  }

  return fallback;
}

function parsePublishedAt(value?: string) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function parseVideoId(value?: string) {
  if (!value) {
    return null;
  }

  const idMatch = value.match(/yt:video:([^/?#]+)/);
  const queryMatch = value.match(/[?&]v=([^&#]+)/);

  return idMatch?.[1] ?? queryMatch?.[1] ?? null;
}

function createDescription(value?: string) {
  const text = cleanText(value);

  if (!text) {
    return "Open the original YouTube video for the full research context.";
  }

  return truncate(text, 180);
}

function cleanText(value?: unknown) {
  return String(value ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const trimmed = value.slice(0, maxLength).trim();
  return `${trimmed.replace(/[.,;:!?-]+$/, "")}...`;
}
