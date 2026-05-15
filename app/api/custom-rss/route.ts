import { NextResponse, type NextRequest } from "next/server";
import Parser from "rss-parser";
import type { CustomRssSource } from "@/lib/custom-rss-sources";
import type { SnsVideo } from "@/lib/sns/types";

type FeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  id?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  videoId?: string;
  mediaGroup?: {
    "media:description"?: string[];
    "media:thumbnail"?: Array<{ $?: { url?: string } }>;
  };
};

type RequestBody = {
  sources?: CustomRssSource[];
};

const parser = new Parser<Record<string, never>, FeedItem>({
  customFields: {
    item: [
      "summary",
      ["yt:videoId", "videoId"],
      ["media:group", "mediaGroup"],
    ],
  },
});

const MAX_CUSTOM_ITEMS = 80;
const REQUEST_TIMEOUT_MS = 9000;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const sources = Array.isArray(body.sources)
    ? body.sources.filter((source) => source.enabled).slice(0, 20)
    : [];

  if (sources.length === 0) {
    return NextResponse.json({
      videos: [],
      count: 0,
      refreshedAt: new Date().toISOString(),
    });
  }

  const results = await Promise.allSettled(sources.map(fetchCustomSource));
  const videos = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, MAX_CUSTOM_ITEMS);

  return NextResponse.json({
    videos,
    count: videos.length,
    refreshedAt: new Date().toISOString(),
  });
}

async function fetchCustomSource(source: CustomRssSource): Promise<SnsVideo[]> {
  try {
    if (!isValidHttpUrl(source.url)) {
      return [];
    }

    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "ChainBrief/0.1 Custom RSS Reader",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${source.name} custom RSS returned ${response.status}`);
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);

    return feed.items
      .map((item) => normalizeItem(item, source))
      .filter((video): video is SnsVideo => Boolean(video));
  } catch (error) {
    console.error(`Failed to fetch custom RSS source: ${source.name}`, error);
    return [];
  }
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeItem(item: FeedItem, source: CustomRssSource): SnsVideo | null {
  const title = cleanText(item.title);
  const videoId =
    source.type === "youtube"
      ? item.videoId ?? parseVideoId(item.id) ?? parseVideoId(item.link)
      : null;
  const url =
    source.type === "youtube" && videoId
      ? createYouTubeVideoUrl(videoId)
      : item.link ?? item.guid;

  if (!title || !url) {
    return null;
  }

  const description = createDescription(
    cleanText(
      item.mediaGroup?.["media:description"]?.[0] ??
        stripHtml(item.contentSnippet ?? item.summary ?? item.content),
    ),
  );
  const tags = createTags(title, description);
  const category = source.customCategory?.trim()
    ? source.customCategory.trim()
    : inferCategory(title, description, tags);

  return {
    id: `custom-${source.id}-${createHash(`${url}-${title}`)}`,
    provider: source.type === "youtube" ? "youtube" : "rss",
    sourceId: source.id,
    sourceName: source.name,
    title,
    url,
    thumbnailUrl:
      item.mediaGroup?.["media:thumbnail"]?.[0]?.$?.url ??
      (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ""),
    publishedAt: parsePublishedAt(item.isoDate ?? item.pubDate),
    description,
    category,
    tags,
  };
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
  const shortMatch = value.match(/youtu\.be\/([^/?#]+)/);
  const pathMatch = value.match(/youtube\.com\/(?:embed|shorts)\/([^/?#]+)/);

  return idMatch?.[1] ?? queryMatch?.[1] ?? shortMatch?.[1] ?? pathMatch?.[1] ?? null;
}

function createYouTubeVideoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

function createDescription(value?: string) {
  const text = cleanText(value);
  return text
    ? truncate(text, 180)
    : "Open the original RSS item for the full context.";
}

function createTags(title: string, description: string) {
  const text = `${title} ${description}`;
  const inferredTags = [
    ["Bitcoin", /\b(bitcoin|btc|satoshi)\b/i],
    ["Ethereum", /\b(ethereum|ether|eth|evm|rollup)\b/i],
    ["Solana", /\b(solana|sol)\b/i],
    ["Macro", /\b(fed|rates|inflation|liquidity|dollar|macro|cycle)\b/i],
    ["Security", /\b(security|hack|exploit|wallet|scam|audit)\b/i],
    ["AI & Crypto", /\b(ai|agent|machine learning|depin)\b/i],
    ["Research", /\b(research|analysis|thesis|deep dive|data)\b/i],
  ]
    .filter(([, pattern]) => pattern instanceof RegExp && pattern.test(text))
    .map(([tag]) => tag as string);

  return Array.from(new Set(inferredTags.length ? inferredTags : ["Research"])).slice(
    0,
    4,
  );
}

function inferCategory(
  title: string,
  description: string,
  tags: string[],
): string {
  const text = `${title} ${description} ${tags.join(" ")}`;

  if (/\b(security|hack|exploit|wallet|scam|audit)\b/i.test(text)) {
    return "Security";
  }

  if (/\b(ai|agent|machine learning|depin)\b/i.test(text)) {
    return "AI & Crypto";
  }

  if (/\b(solana|sol)\b/i.test(text)) {
    return "Solana";
  }

  if (/\b(ethereum|ether|eth|evm|rollup)\b/i.test(text)) {
    return "Ethereum";
  }

  if (/\b(bitcoin|btc|satoshi)\b/i.test(text)) {
    return "Bitcoin";
  }

  if (/\b(fed|rates|inflation|liquidity|dollar|macro|cycle)\b/i.test(text)) {
    return "Macro";
  }

  return "Research";
}

function cleanText(value?: unknown) {
  const text =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";

  return text
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

function stripHtml(value?: string) {
  return value
    ?.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const trimmed = value.slice(0, maxLength).trim();
  return `${trimmed.replace(/[.,;:!?-]+$/, "")}...`;
}

function createHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
