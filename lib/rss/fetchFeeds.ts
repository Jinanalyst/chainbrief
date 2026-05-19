import Parser from "rss-parser";
import type { CustomRssSource } from "@/lib/custom-rss-sources";
import { createAiBrief, createRuleBasedBrief } from "@/lib/rss/ai";
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
  enclosure?: { url?: string; type?: string };
  "content:encoded"?: string;
  "media:content"?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
  "media:thumbnail"?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
};

const parser = new Parser<Record<string, never>, FeedItem>({
  customFields: {
    item: [
      "summary",
      "creator",
      "categories",
      "content:encoded",
      "media:content",
      "media:thumbnail",
    ],
  },
});

const MAX_ARTICLES = 120;
const REQUEST_TIMEOUT_MS = 9000;

export class AllRssSourcesFailedError extends Error {
  constructor() {
    super("All RSS sources failed.");
    this.name = "AllRssSourcesFailedError";
  }
}

export async function fetchFeeds(options: { withAiSummaries?: boolean } = {}): Promise<Article[]> {
  const feedResults = await Promise.allSettled(
    rssSources.map((source) => fetchSourceFeed(source, options)),
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
  options: { withAiSummaries?: boolean },
): Promise<{ ok: boolean; articles: Article[] }> {
  try {
    if (source.kind === "html") {
      return { ok: true, articles: await fetchHtmlSource(source, options) };
    }

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
    const normalized = feed.items
      .map((item) => normalizeItem(item, source))
      .filter((article): article is Article => Boolean(article));
    const articles = options.withAiSummaries
      ? [
          ...(await Promise.all(normalized.slice(0, 20).map(enrichWithAiBrief))),
          ...normalized.slice(20),
        ]
      : normalized;

    return { ok: true, articles };
  } catch (error) {
    console.error(`Failed to fetch RSS source: ${source.name}`, error);
    return { ok: false, articles: [] };
  }
}

async function fetchHtmlSource(
  source: RssSource,
  options: { withAiSummaries?: boolean },
) {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "ChainBrief/0.1 Official Source Reader",
      Accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: RSS_REFRESH_SECONDS },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${source.name} source returned ${response.status}`);
  }

  const html = await response.text();
  const articles = extractOfficialLinks(html, source);
  return options.withAiSummaries
    ? [
        ...(await Promise.all(articles.slice(0, 10).map(enrichWithAiBrief))),
        ...articles.slice(10),
      ]
    : articles;
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

async function enrichWithAiBrief(article: Article) {
  return {
    ...article,
    briefSummary: await createAiBrief(article),
  };
}

function normalizeItem(item: FeedItem, source: RssSource): Article | null {
  const title = cleanText(item.title);
  const originalUrl = item.link ?? item.guid;

  if (!title || !originalUrl) {
    return null;
  }

  const content = item.contentSnippet ?? item.summary ?? item.content ?? item["content:encoded"];
  const publishedAt = parsePublishedAt(item.isoDate ?? item.pubDate);
  const rawContentSnippet = cleanText(stripHtml(content));
  const excerpt = createExcerpt(rawContentSnippet, source.defaultCategory);
  const tags = createTags(item.categories, title, rawContentSnippet, source.defaultCategory);
  const category = inferCategory(source.defaultCategory, title, rawContentSnippet, tags);
  const marketImpact = inferMarketImpact(title, rawContentSnippet);

  const article: Article = {
    id: createArticleId(`${source.id}-${originalUrl}-${title}`),
    title,
    slug: slugify(title),
    sourceId: source.id,
    sourceName: source.name,
    originalUrl,
    publishedAt,
    excerpt,
    category,
    tags,
    readingTime: estimateReadingTime(excerpt || title),
    briefSummary: "",
    rawContentSnippet,
    imageUrl: findImageUrl(item, content),
    marketImpact,
    feedCategory: category,
  };

  return { ...article, briefSummary: createRuleBasedBrief(article) };
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
  const excerpt = createExcerpt(rawContentSnippet, source.category);
  const defaultCategory =
    source.category === "Stock Market" ? "국내증시" : source.category;
  const tags = createTags(item.categories, title, rawContentSnippet, defaultCategory);
  const stockTags = [
    source.region,
    source.marketType,
    source.tickerSymbol,
    source.category === "Stock Market" ? "국내증시" : undefined,
  ].filter((tag): tag is string => Boolean(tag));
  const category = inferCategory(defaultCategory, title, rawContentSnippet, tags);

  const article: Article = {
    id: createArticleId(`${source.id}-${originalUrl}-${title}`),
    title,
    slug: slugify(title),
    sourceId: source.id,
    sourceName: source.name,
    originalUrl,
    publishedAt,
    excerpt,
    category,
    tags: Array.from(new Set([...stockTags, ...tags])).slice(0, 8),
    readingTime: estimateReadingTime(excerpt || title),
    briefSummary: "",
    rawContentSnippet,
    imageUrl: findImageUrl(item, item.content ?? item.summary),
    marketImpact: inferMarketImpact(title, rawContentSnippet),
    feedCategory: source.category,
    customCategory: source.customCategory || undefined,
    marketType: source.marketType,
    region: source.region,
    tickerSymbol: source.tickerSymbol,
  };

  return { ...article, briefSummary: createRuleBasedBrief(article) };
}

function extractOfficialLinks(html: string, source: RssSource): Article[] {
  const normalized = html.replace(/\s+/g, " ");
  const links = Array.from(
    normalized.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi),
  )
    .map((match) => {
      const title = cleanText(stripHtml(match[2]));
      const originalUrl = toAbsoluteUrl(match[1], source.url);
      return { title, originalUrl };
    })
    .filter((item) => item.title.length >= 8 && item.originalUrl);
  const unique = new Map<string, { title: string; originalUrl: string }>();

  for (const item of links) {
    const text = `${item.title} ${item.originalUrl}`;
    if (!/(보도|자료|정책|경제|금융|부동산|press|bbs|news|article)/i.test(text)) {
      continue;
    }
    unique.set(item.originalUrl, item);
  }

  return Array.from(unique.values())
    .slice(0, 12)
    .map((item) => {
      const excerpt = `${source.name} 공식 페이지에서 확인된 최신 ${source.defaultCategory} 소식입니다.`;
      const tags = createTags([], item.title, excerpt, source.defaultCategory);
      const article: Article = {
        id: createArticleId(`${source.id}-${item.originalUrl}-${item.title}`),
        title: item.title,
        slug: slugify(item.title),
        sourceId: source.id,
        sourceName: source.name,
        originalUrl: item.originalUrl,
        publishedAt: new Date().toISOString(),
        excerpt,
        category: source.defaultCategory,
        tags,
        readingTime: "1 min read",
        briefSummary: "",
        rawContentSnippet: excerpt,
        marketImpact: inferMarketImpact(item.title, excerpt),
        feedCategory: source.defaultCategory,
      };

      return { ...article, briefSummary: createRuleBasedBrief(article) };
    });
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

function createExcerpt(value: string | undefined, category: string) {
  const text = cleanText(value);

  if (!text) {
    return `${category} 기사 원문에서 전체 맥락을 확인하세요.`;
  }

  return truncate(text, 240);
}

function createTags(
  categories: unknown[] | undefined,
  title: string,
  summary: string,
  fallback: string,
) {
  const text = `${title} ${summary}`;
  const rssTags = Array.isArray(categories) ? categories : [];
  const inferredTags = [
    ["BTC", /\b(bitcoin|btc)\b|비트코인/i],
    ["ETH", /\b(ethereum|ether|eth)\b|이더리움/i],
    ["NASDAQ", /\b(nasdaq|나스닥)\b/i],
    ["FED", /\b(fed|fomc|federal reserve|연준|금리)\b/i],
    ["NVIDIA", /\b(nvidia|nvda|엔비디아)\b/i],
    ["KOSPI", /\b(kospi|코스피)\b/i],
    ["KOSDAQ", /\b(kosdaq|코스닥)\b/i],
    ["Real Estate", /부동산|주택|분양|아파트|real estate/i],
    ["AI", /\b(ai|artificial intelligence)\b|인공지능/i],
    ["ETF", /\betf\b/i],
  ]
    .filter(([, pattern]) => pattern instanceof RegExp && pattern.test(text))
    .map(([tag]) => tag as string);

  return Array.from(new Set([...inferredTags, ...rssTags, fallback]))
    .map((tag) => cleanText(tag))
    .filter(Boolean)
    .slice(0, 8);
}

function inferCategory(fallback: string, title: string, summary: string, tags: string[]) {
  const text = `${title} ${summary} ${tags.join(" ")}`;

  if (/부동산|주택|분양|아파트|전세|real estate/i.test(text)) {
    return "부동산";
  }

  if (/비트코인|이더리움|가상자산|암호화폐|crypto|bitcoin|ethereum|defi|web3|token/i.test(text)) {
    return "가상자산";
  }

  if (/코스피|코스닥|증시|주식|금융|종목|상장|stock|equity/i.test(text)) {
    return "국내증시";
  }

  if (/경제|물가|금리|환율|gdp|fed|fomc|연준|한국은행|macro/i.test(text)) {
    return "Macro";
  }

  return fallback;
}

function inferMarketImpact(title: string, summary: string): Article["marketImpact"] {
  const text = `${title} ${summary}`.toLowerCase();
  if (/상승|급등|호재|완화|인하|bull|rally|surge|gain|record high|approve/.test(text)) {
    return "Bullish";
  }
  if (/하락|급락|악재|침체|인상|위기|bear|drop|fall|selloff|risk|lawsuit|crackdown/.test(text)) {
    return "Bearish";
  }
  return "Neutral";
}

function findImageUrl(item: FeedItem, content?: string) {
  const mediaContent = Array.isArray(item["media:content"])
    ? item["media:content"][0]?.$?.url
    : item["media:content"]?.$?.url;
  const mediaThumbnail = Array.isArray(item["media:thumbnail"])
    ? item["media:thumbnail"][0]?.$?.url
    : item["media:thumbnail"]?.$?.url;
  const enclosure = item.enclosure?.type?.startsWith("image/") ? item.enclosure.url : undefined;
  const contentImage = content?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];

  return [mediaContent, mediaThumbnail, enclosure, contentImage]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find((value) => /^https?:\/\//i.test(value));
}

function toAbsoluteUrl(value: string, base: string) {
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
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
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || `brief-${Date.now()}`
  );
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
