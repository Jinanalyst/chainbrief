import Parser from "rss-parser";
import type { CustomRssSource } from "@/lib/custom-rss-sources";
import { RSS_REFRESH_SECONDS, rssSources, type RssSource } from "@/lib/rss/sources";
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
  customFields: {
    item: ["summary", "creator", "categories"],
  },
});

const MAX_ARTICLES = 80;
const REQUEST_TIMEOUT_MS = 9000;

export class AllRssSourcesFailedError extends Error {
  constructor() {
    super("All RSS sources failed.");
    this.name = "AllRssSourcesFailedError";
  }
}

export async function fetchFeeds(): Promise<Article[]> {
  const feedResults = await Promise.allSettled(
    rssSources.map((source) => fetchSourceFeed(source)),
  );

  const sourceResults = feedResults.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { ok: false, articles: [] as Article[] },
  );

  const successfulSources = sourceResults.filter((result) => result.ok).length;

  if (successfulSources === 0) {
    throw new AllRssSourcesFailedError();
  }

  const articles = sourceResults.flatMap((result) => result.articles);

  return removeDuplicateArticles(articles)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, MAX_ARTICLES);
}

export async function fetchPersonalizedFeeds(
  customSources: CustomRssSource[] = [],
): Promise<Article[]> {
  const enabledCustomSources = customSources
    .filter((source) => source.enabled && source.type === "rss")
    .slice(0, 20);
  const [baseResult, customResults] = await Promise.all([
    fetchFeeds().then(
      (articles) => ({ ok: true, articles }),
      () => ({ ok: false, articles: [] as Article[] }),
    ),
    Promise.allSettled(enabledCustomSources.map(fetchCustomSourceFeed)),
  ]);
  const customArticles = customResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value.articles : [],
  );
  const articles = [...customArticles, ...baseResult.articles];

  if (articles.length === 0) {
    throw new AllRssSourcesFailedError();
  }

  return removeDuplicateArticles(articles)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, MAX_ARTICLES);
}

async function fetchSourceFeed(
  source: RssSource,
): Promise<{ ok: boolean; articles: Article[] }> {
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "ChainBrief/0.1 RSS Reader",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: {
        revalidate: RSS_REFRESH_SECONDS,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${source.name} RSS returned ${response.status}`);
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);

    const articles = feed.items
      .map((item) => normalizeItem(item, source))
      .filter((article): article is Article => Boolean(article));

    return { ok: true, articles };
  } catch (error) {
    console.error(`Failed to fetch RSS source: ${source.name}`, error);
    return { ok: false, articles: [] };
  }
}

async function fetchCustomSourceFeed(
  source: CustomRssSource,
): Promise<{ ok: boolean; articles: Article[] }> {
  try {
    if (!isValidHttpUrl(source.url)) {
      return { ok: false, articles: [] };
    }

    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "ChainBrief/0.1 Personalized RSS Reader",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${source.name} custom RSS returned ${response.status}`);
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);
    const articles = feed.items
      .map((item) => normalizeCustomItem(item, source))
      .filter((article): article is Article => Boolean(article));

    return { ok: true, articles };
  } catch (error) {
    console.error(`Failed to fetch custom brief RSS source: ${source.name}`, error);
    return { ok: false, articles: [] };
  }
}

function normalizeItem(item: FeedItem, source: RssSource): Article | null {
  const title = cleanText(item.title);
  const originalUrl = item.link ?? item.guid;

  if (!title || !originalUrl) {
    return null;
  }

  const publishedAt = parsePublishedAt(item.isoDate ?? item.pubDate);
  const rawContentSnippet = cleanText(stripHtml(item.contentSnippet ?? item.summary));
  const excerpt = createExcerpt(rawContentSnippet);
  const tags = createTags(item.categories, title, source.defaultCategory);

  const isStockSource = source.defaultCategory === "Stock Market";

  return {
    id: createArticleId(`${source.name}-${originalUrl}-${title}`),
    title,
    slug: slugify(title),
    sourceId: source.id,
    sourceName: source.name,
    originalUrl,
    publishedAt,
    excerpt,
    category: isStockSource ? "Stock Market" : inferCategory(source.defaultCategory, title, tags),
    tags,
    readingTime: estimateReadingTime(excerpt || title),
    briefSummary: createBriefSummary(title, rawContentSnippet),
    rawContentSnippet,
    feedCategory: isStockSource ? "Stock Market" : undefined,
  };
}

function normalizeCustomItem(
  item: FeedItem,
  source: CustomRssSource,
): Article | null {
  const title = cleanText(item.title);
  const originalUrl = item.link ?? item.guid;

  if (!title || !originalUrl) {
    return null;
  }

  const publishedAt = parsePublishedAt(item.isoDate ?? item.pubDate);
  const rawContentSnippet = cleanText(stripHtml(item.contentSnippet ?? item.summary));
  const excerpt = createExcerpt(rawContentSnippet);
  const defaultCategory =
    source.category === "Stock Market" ? "Stock Market" : source.category;
  const tags = createTags(item.categories, title, defaultCategory);
  const stockTags = [
    source.region,
    source.marketType,
    source.tickerSymbol,
    source.category === "Stock Market" ? "Stock Market" : undefined,
  ].filter((tag): tag is string => Boolean(tag));

  return {
    id: createArticleId(`${source.id}-${originalUrl}-${title}`),
    title,
    slug: slugify(title),
    sourceId: source.id,
    sourceName: source.name,
    originalUrl,
    publishedAt,
    excerpt,
    category:
      source.category === "Stock Market"
        ? "Stock Market"
        : inferCategory(defaultCategory, title, tags),
    tags: Array.from(new Set([...stockTags, ...tags])).slice(0, 6),
    readingTime: estimateReadingTime(excerpt || title),
    briefSummary: createBriefSummary(title, rawContentSnippet),
    rawContentSnippet,
    feedCategory: source.category,
    marketType: source.marketType,
    region: source.region,
    tickerSymbol: source.tickerSymbol,
  };
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function removeDuplicateArticles(articles: Article[]) {
  const seen = new Set<string>();

  return articles.filter((article) => {
    const titleKey = normalizeKey(article.title);
    const linkKey = normalizeKey(article.originalUrl);
    const duplicateKey = `${titleKey}:${linkKey}`;

    if (seen.has(titleKey) || seen.has(linkKey) || seen.has(duplicateKey)) {
      return false;
    }

    seen.add(titleKey);
    seen.add(linkKey);
    seen.add(duplicateKey);
    return true;
  });
}

function parsePublishedAt(value?: string) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function createExcerpt(value?: string) {
  const text = cleanText(value);

  if (!text) {
    return "Read the original source for the full context behind this developing crypto story.";
  }

  return truncate(text, 220);
}

function createBriefSummary(title: string, rawContentSnippet: string) {
  const sourceText = rawContentSnippet || title;
  return `Brief: ${truncate(sourceText, 150)}`;
}

function createTags(categories: unknown[] | undefined, title: string, fallback: string) {
  const rssTags = Array.isArray(categories) ? categories : [];
  const inferredTags = [
    ["Bitcoin", /\b(bitcoin|btc)\b/i],
    ["Ethereum", /\b(ethereum|ether|eth)\b/i],
    ["Solana", /\b(solana|sol)\b/i],
    ["DeFi", /\b(defi|protocol|lending|dex)\b/i],
    ["Macro", /\b(fed|rates|inflation|dollar|macro)\b/i],
  ]
    .filter(([, pattern]) => pattern instanceof RegExp && pattern.test(title))
    .map(([tag]) => tag as string);

  return Array.from(new Set([...inferredTags, ...rssTags, fallback]))
    .map((tag) => cleanText(tag))
    .filter(Boolean)
    .slice(0, 4);
}

function inferCategory(fallback: string, title: string, tags: string[]) {
  const text = `${title} ${tags.join(" ")}`;

  if (/\b(bitcoin|btc)\b/i.test(text)) {
    return "Bitcoin";
  }

  if (/\b(ethereum|ether|eth)\b/i.test(text)) {
    return "Ethereum";
  }

  if (/\b(solana|sol)\b/i.test(text)) {
    return "Solana";
  }

  if (/\b(defi|protocol|lending|dex)\b/i.test(text)) {
    return "DeFi";
  }

  if (/\b(fed|rates|inflation|dollar|macro|etf)\b/i.test(text)) {
    return "Macro";
  }

  if (/\b(sec|law|lawsuit|policy|regulation|senate|court)\b/i.test(text)) {
    return "Regulation";
  }

  return fallback;
}

function estimateReadingTime(text: string) {
  const words = cleanText(text).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return `${minutes} min read`;
}

function createArticleId(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripHtml(value?: string) {
  return value
    ?.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
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

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const trimmed = value.slice(0, maxLength).trim();
  return `${trimmed.replace(/[.,;:!?-]+$/, "")}...`;
}
