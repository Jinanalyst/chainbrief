import type { Article } from "@/lib/rss/types";

export const COMMUNITY_POSTS_STORAGE_KEY = "chain-brief-community-posts";
export const COMMUNITY_POSTS_CHANGED_EVENT = "chain-brief-community-posts-changed";
export const COMMUNITY_QUOTE_STORAGE_KEY = "chain-brief-community-quote";
export const COMMUNITY_QUOTE_CHANGED_EVENT = "chain-brief-community-quote-changed";

export type CommunityPostKind = "opinion" | "repost" | "quote";
export type CommunityStance = "Bullish" | "Bearish" | "Neutral" | "Question";

export type CommunityPost = {
  id: string;
  slug: string;
  title: string;
  body: string;
  preview: string;
  author: string;
  avatar?: string;
  category: string;
  publishedAt: string;
  likes: number;
  commentsCount: number;
  views: number;
  tags: string[];
  createdAt: string;
  kind: CommunityPostKind;
  topic?: string;
  stance?: CommunityStance;
  discussionType?: "news_reaction" | "analysis" | "question" | "event" | "opinion";
  sourceName?: string;
  articleTitle?: string;
  articleUrl?: string;
  articleCategory?: string;
  articleSummary?: string;
  relatedArticleSlug?: string;
  relatedArticleTitle?: string;
  relatedArticleSource?: string;
  relatedArticleUrl?: string;
};

export type CommunityQuoteTarget = {
  id: string;
  slug: string;
  title: string;
  sourceName: string;
  category: string;
  originalUrl: string;
  publishedAt: string;
  excerpt: string;
  briefSummary: string;
};

export function readCommunityPosts(): CommunityPost[] {
  if (typeof window === "undefined") {
    return MOCK_COMMUNITY_POSTS;
  }

  const stored = window.localStorage.getItem(COMMUNITY_POSTS_STORAGE_KEY);

  if (!stored) {
    return MOCK_COMMUNITY_POSTS;
  }

  try {
    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed
          .map(normalizeCommunityPost)
          .filter((post): post is CommunityPost => Boolean(post))
          .sort(sortPostsNewestFirst)
      : MOCK_COMMUNITY_POSTS;
  } catch {
    return MOCK_COMMUNITY_POSTS;
  }
}

export function writeCommunityPosts(posts: CommunityPost[]) {
  if (typeof window === "undefined") {
    return;
  }

  const nextPosts = posts.slice(0, 100).sort(sortPostsNewestFirst);
  window.localStorage.setItem(
    COMMUNITY_POSTS_STORAGE_KEY,
    JSON.stringify(nextPosts),
  );
  window.dispatchEvent(
    new CustomEvent(COMMUNITY_POSTS_CHANGED_EVENT, {
      detail: nextPosts,
    }),
  );
}

export function addOpinionPost(
  body: string,
  topic?: string,
  options?: {
    author?: string;
    avatar?: string;
    stance?: CommunityStance;
    title?: string;
    discussionType?: CommunityPost["discussionType"];
    relatedArticleSlug?: string;
    relatedArticleTitle?: string;
    relatedArticleSource?: string;
    relatedArticleUrl?: string;
  },
) {
  const title = options?.title ?? buildOpinionTitle(body);
  const nextPost: CommunityPost = {
    id: createPostId(),
    slug: slugify(`${topic ?? "community"}-${title}`),
    title,
    body: body.trim(),
    preview: truncate(body.trim(), 120),
    author: options?.author ?? "You",
    avatar: options?.avatar ?? "CB",
    category: topic ?? "All",
    publishedAt: new Date().toISOString(),
    likes: 0,
    commentsCount: 0,
    views: 0,
    tags: topic && topic !== "All" ? [topic] : [],
    createdAt: new Date().toISOString(),
    kind: "opinion",
    topic,
    stance: options?.stance ?? "Neutral",
    discussionType: options?.discussionType ?? "opinion",
    relatedArticleSlug: options?.relatedArticleSlug,
    relatedArticleTitle: options?.relatedArticleTitle,
    relatedArticleSource: options?.relatedArticleSource,
    relatedArticleUrl: options?.relatedArticleUrl,
  };

  const nextPosts = [nextPost, ...readCommunityPosts()];
  writeCommunityPosts(nextPosts);
  return nextPost;
}

export function addQuotePost(
  body: string,
  target: CommunityQuoteTarget,
  options?: {
    title?: string;
    stance?: CommunityStance;
    author?: string;
  },
) {
  const nextPost: CommunityPost = {
    id: createPostId(),
    slug: slugify(`${target.slug}-${truncate(body.trim() || target.title, 60)}`),
    title:
      options?.title ?? (body.trim() ? truncate(body.trim(), 70) : `Thoughts on ${target.title}`),
    body: body.trim(),
    preview: truncate(body.trim() || target.briefSummary, 120),
    author: options?.author ?? "You",
    avatar: options?.author ? options.author.slice(0, 2).toUpperCase() : "CB",
    category: target.category,
    publishedAt: new Date().toISOString(),
    likes: 0,
    commentsCount: 0,
    views: 0,
    tags: [target.category, "News Reactions"].filter(Boolean),
    createdAt: new Date().toISOString(),
    kind: "quote",
    topic: target.category,
    stance: options?.stance ?? "Neutral",
    discussionType: "news_reaction",
    sourceName: target.sourceName,
    articleTitle: target.title,
    articleUrl: target.originalUrl,
    articleCategory: target.category,
    articleSummary: target.briefSummary,
    relatedArticleSlug: target.slug,
    relatedArticleTitle: target.title,
    relatedArticleSource: target.sourceName,
    relatedArticleUrl: target.originalUrl,
  };

  const nextPosts = [nextPost, ...readCommunityPosts()];
  writeCommunityPosts(nextPosts);
  return nextPost;
}

export function repostArticleToCommunity(
  article: Article,
) {
  const nextPost: CommunityPost = {
    id: createPostId(),
    slug: article.slug,
    title: article.title,
    body: article.excerpt || article.briefSummary || article.title,
    preview: truncate(article.excerpt || article.briefSummary || article.title, 120),
    author: "Chain Brief",
    avatar: "CB",
    category: article.category,
    publishedAt: article.publishedAt,
    likes: 0,
    commentsCount: 0,
    views: 0,
    tags: article.tags.slice(0, 3),
    createdAt: new Date().toISOString(),
    kind: "repost",
    topic: article.category,
    stance: "Neutral",
    discussionType: "news_reaction",
    sourceName: article.sourceName,
    articleTitle: article.title,
    articleUrl: article.originalUrl,
    articleCategory: article.category,
    articleSummary: article.briefSummary,
    relatedArticleSlug: article.slug,
    relatedArticleTitle: article.title,
    relatedArticleSource: article.sourceName,
    relatedArticleUrl: article.originalUrl,
  };

  const nextPosts = [nextPost, ...readCommunityPosts()];
  writeCommunityPosts(nextPosts);
  return nextPost;
}

export function storeCommunityQuoteTarget(article: Article) {
  if (typeof window === "undefined") {
    return;
  }

  const target: CommunityQuoteTarget = {
    id: article.id,
    slug: article.slug,
    title: article.title,
    sourceName: article.sourceName,
    category: article.category,
    originalUrl: article.originalUrl,
    publishedAt: article.publishedAt,
    excerpt: article.excerpt,
    briefSummary: article.briefSummary,
  };

  window.localStorage.setItem(
    COMMUNITY_QUOTE_STORAGE_KEY,
    JSON.stringify(target),
  );
  window.dispatchEvent(
    new CustomEvent(COMMUNITY_QUOTE_CHANGED_EVENT, {
      detail: target,
    }),
  );
}

export function readCommunityQuoteTarget(): CommunityQuoteTarget | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(COMMUNITY_QUOTE_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    return isCommunityQuoteTarget(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCommunityQuoteTarget() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(COMMUNITY_QUOTE_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(COMMUNITY_QUOTE_CHANGED_EVENT));
}

function sortPostsNewestFirst(a: CommunityPost, b: CommunityPost) {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

function createPostId() {
  return `community-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isCommunityPost(value: unknown): value is CommunityPost {
  if (!value || typeof value !== "object") {
    return false;
  }

  const post = value as CommunityPost;

  return (
    typeof post.id === "string" &&
    typeof post.slug === "string" &&
    typeof post.title === "string" &&
    typeof post.body === "string" &&
    typeof post.preview === "string" &&
    typeof post.author === "string" &&
    typeof post.category === "string" &&
    typeof post.publishedAt === "string" &&
    typeof post.createdAt === "string" &&
    typeof post.likes === "number" &&
    typeof post.commentsCount === "number" &&
    typeof post.views === "number" &&
    Array.isArray(post.tags) &&
    (post.kind === "opinion" || post.kind === "repost" || post.kind === "quote")
  );
}

function isCommunityQuoteTarget(value: unknown): value is CommunityQuoteTarget {
  if (!value || typeof value !== "object") {
    return false;
  }

  const target = value as CommunityQuoteTarget;

  return (
    typeof target.id === "string" &&
    typeof target.slug === "string" &&
    typeof target.title === "string" &&
    typeof target.sourceName === "string" &&
    typeof target.category === "string" &&
    typeof target.originalUrl === "string" &&
    typeof target.publishedAt === "string" &&
    typeof target.excerpt === "string" &&
    typeof target.briefSummary === "string"
  );
}

function normalizeCommunityPost(value: unknown): CommunityPost | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const post = value as Partial<CommunityPost>;
  if (!post.body || !post.title) {
    return null;
  }

  const createdAt = typeof post.createdAt === "string" ? post.createdAt : new Date().toISOString();
  const publishedAt =
    typeof post.publishedAt === "string" ? post.publishedAt : createdAt;
  const slug = typeof post.slug === "string" ? post.slug : slugify(post.title);
  const category = typeof post.category === "string" ? post.category : "All";

  return {
    id: typeof post.id === "string" ? post.id : createPostId(),
    slug,
    title: post.title,
    body: post.body,
    preview: typeof post.preview === "string" ? post.preview : truncate(post.body, 120),
    author: typeof post.author === "string" ? post.author : "Community",
    avatar: typeof post.avatar === "string" ? post.avatar : undefined,
    category,
    publishedAt,
    likes: typeof post.likes === "number" ? post.likes : 0,
    commentsCount: typeof post.commentsCount === "number" ? post.commentsCount : 0,
    views: typeof post.views === "number" ? post.views : 0,
    tags: Array.isArray(post.tags) ? post.tags.filter((tag): tag is string => typeof tag === "string") : [],
    createdAt,
    kind: post.kind === "repost" || post.kind === "quote" ? post.kind : "opinion",
    topic: post.topic,
    stance: post.stance,
    discussionType: post.discussionType,
    sourceName: post.sourceName,
    articleTitle: post.articleTitle,
    articleUrl: post.articleUrl,
    articleCategory: post.articleCategory,
    articleSummary: post.articleSummary,
    relatedArticleSlug: post.relatedArticleSlug,
    relatedArticleTitle: post.relatedArticleTitle,
    relatedArticleSource: post.relatedArticleSource,
    relatedArticleUrl: post.relatedArticleUrl,
  };
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;
}

function buildOpinionTitle(body: string) {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "New discussion";
  }

  return truncate(trimmed, 48);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `discussion-${Date.now()}`;
}

const MOCK_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "mock-community-1",
    slug: "bitcoin-etf-flows-reset-the-weekly-market-narrative",
    title: "Bitcoin ETF flows reset the weekly market narrative",
    body: "ETF flows still look like the cleanest short-term signal for BTC momentum.",
    preview: "ETF flows still look like the cleanest short-term signal for BTC momentum.",
    author: "Chain Brief",
    category: "Bitcoin",
    publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    likes: 48,
    commentsCount: 12,
    views: 240,
    tags: ["Bitcoin", "News Reactions"],
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    kind: "quote",
    stance: "Bullish",
    discussionType: "news_reaction",
    sourceName: "CoinDesk",
    articleTitle: "Bitcoin ETF flows reset the weekly market narrative",
    articleUrl: "#",
    articleCategory: "Bitcoin",
    articleSummary: "ETF inflows and market structure are shaping the near-term BTC debate.",
    relatedArticleSlug: "bitcoin-etf-flows-reset-the-weekly-market-narrative",
    relatedArticleTitle: "Bitcoin ETF flows reset the weekly market narrative",
    relatedArticleSource: "CoinDesk",
    relatedArticleUrl: "#",
  },
  {
    id: "mock-community-2",
    slug: "ethereum-rollup-economics-and-liquidity-rotation",
    title: "Ethereum rollup economics and liquidity rotation",
    body: "I think liquidity is still rotating toward ETH infrastructure plays.",
    preview: "I think liquidity is still rotating toward ETH infrastructure plays.",
    author: "Market Watcher",
    category: "Ethereum",
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    likes: 31,
    commentsCount: 8,
    views: 180,
    tags: ["Ethereum", "Analysis"],
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    kind: "opinion",
    stance: "Bullish",
    discussionType: "analysis",
    sourceName: "Community",
  },
  {
    id: "mock-community-3",
    slug: "stablecoin-bill-senate-negotiations",
    title: "Stablecoin bill moves into final Senate negotiations",
    body: "Question is whether the final language changes issuer requirements materially.",
    preview: "Question is whether the final language changes issuer requirements materially.",
    author: "Policy Lens",
    category: "Regulation",
    publishedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    likes: 22,
    commentsCount: 17,
    views: 144,
    tags: ["Regulation", "Questions"],
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    kind: "opinion",
    stance: "Question",
    discussionType: "question",
    sourceName: "Community",
  },
  {
    id: "mock-community-4",
    slug: "cpi-impact-bitcoin-volatility",
    title: "이번 CPI가 비트코인에 미칠 영향",
    body: "매크로 이벤트는 짧게 보면 변동성, 길게 보면 금리 기대를 다시 건드립니다.",
    preview: "매크로 이벤트는 짧게 보면 변동성, 길게 보면 금리 기대를 다시 건드립니다.",
    author: "Macro Desk",
    avatar: "MD",
    category: "Macro",
    publishedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    likes: 36,
    commentsCount: 14,
    views: 211,
    tags: ["Macro", "Event"],
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    kind: "opinion",
    stance: "Neutral",
    discussionType: "event",
    sourceName: "Community",
  },
  {
    id: "mock-community-5",
    slug: "solana-ecosystem-rotation-possible",
    title: "Solana 생태계 회전 가능성",
    body: "SOL이 다시 생태계 자금 순환의 중심으로 돌아올 구간인지 봐야 합니다.",
    preview: "SOL이 다시 생태계 자금 순환의 중심으로 돌아올 구간인지 봐야 합니다.",
    author: "On-chain Note",
    avatar: "ON",
    category: "Solana",
    publishedAt: new Date(Date.now() - 1000 * 60 * 165).toISOString(),
    likes: 29,
    commentsCount: 9,
    views: 158,
    tags: ["Solana", "Analysis"],
    createdAt: new Date(Date.now() - 1000 * 60 * 165).toISOString(),
    kind: "opinion",
    stance: "Bullish",
    discussionType: "analysis",
    sourceName: "Community",
  },
];
