import { NextResponse, type NextRequest } from "next/server";
import Parser from "rss-parser";
import type { CustomBriefSource } from "@/lib/custom-brief-sources";
import type { Article } from "@/lib/rss/types";

type FeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  creator?: string;
  categories?: unknown[];
};

const parser = new Parser<Record<string, never>, FeedItem>({
  customFields: { item: ["summary", "creator", "categories"] },
});

const MAX_ARTICLES = 40;
const REQUEST_TIMEOUT_MS = 9000;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { sources?: CustomBriefSource[] };
  const sources = Array.isArray(body.sources)
    ? body.sources.filter((s) => s.enabled).slice(0, 10)
    : [];

  if (sources.length === 0) {
    return NextResponse.json({ articles: [], count: 0, refreshedAt: new Date().toISOString() });
  }

  const results = await Promise.allSettled(sources.map(fetchSource));
  const articles = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_ARTICLES);

  return NextResponse.json({
    articles,
    count: articles.length,
    refreshedAt: new Date().toISOString(),
  });
}

async function fetchSource(source: CustomBriefSource): Promise<Article[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "ChainBrief/0.1 RSS Reader",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${source.name} returned ${response.status}`);
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);

    return feed.items
      .map((item) => normalizeItem(item, source))
      .filter((a): a is Article => Boolean(a));
  } catch (error) {
    console.error(`Failed to fetch custom brief source: ${source.name}`, error);
    return [];
  }
}

function normalizeItem(item: FeedItem, source: CustomBriefSource): Article | null {
  const title = cleanText(item.title);
  const originalUrl = item.link ?? item.guid;

  if (!title || !originalUrl) {
    return null;
  }

  const publishedAt = parseDate(item.isoDate ?? item.pubDate);
  const rawSnippet = cleanText(stripHtml(item.contentSnippet ?? item.summary));
  const excerpt = rawSnippet
    ? truncate(rawSnippet, 220)
    : "Read the original source for the full context.";
  const tags = inferTags(title);
  const category = inferCategory(title, tags);

  return {
    id: createId(`${source.id}-${originalUrl}-${title}`),
    title,
    slug: slugify(title),
    sourceId: `custom-brief-${source.id}`,
    sourceName: source.name,
    originalUrl,
    publishedAt,
    excerpt,
    category,
    tags,
    readingTime: `${Math.max(1, Math.ceil(rawSnippet.split(/\s+/).filter(Boolean).length / 220))} min read`,
    briefSummary: `Brief: ${truncate(rawSnippet || title, 150)}`,
    rawContentSnippet: rawSnippet,
  };
}

function inferTags(title: string): string[] {
  return [
    ["Bitcoin", /\b(bitcoin|btc)\b/i],
    ["Ethereum", /\b(ethereum|eth)\b/i],
    ["Solana", /\b(solana|sol)\b/i],
    ["DeFi", /\b(defi|protocol|lending|dex)\b/i],
    ["Macro", /\b(fed|rates|inflation|dollar|macro)\b/i],
    ["Regulation", /\b(sec|law|regulation|senate|court)\b/i],
  ]
    .filter(([, re]) => re instanceof RegExp && re.test(title))
    .map(([tag]) => tag as string)
    .slice(0, 4);
}

function inferCategory(title: string, tags: string[]): string {
  const text = `${title} ${tags.join(" ")}`;
  if (/\b(bitcoin|btc)\b/i.test(text)) return "Bitcoin";
  if (/\b(ethereum|eth)\b/i.test(text)) return "Ethereum";
  if (/\b(solana|sol)\b/i.test(text)) return "Solana";
  if (/\b(defi|protocol|lending|dex)\b/i.test(text)) return "DeFi";
  if (/\b(fed|rates|inflation|dollar|macro|etf)\b/i.test(text)) return "Macro";
  if (/\b(sec|law|lawsuit|policy|regulation|senate|court)\b/i.test(text)) return "Regulation";
  return "Crypto";
}

function parseDate(value?: string) {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function createId(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return `cb${Math.abs(hash).toString(36)}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

function stripHtml(value?: string) {
  return value
    ?.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function cleanText(value?: unknown) {
  const text = typeof value === "string" ? value : "";
  return text
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim().replace(/[.,;:!?-]+$/, "")}...`;
}
