import type { Article } from "@/lib/rss/types";

export const COMMUNITY_POSTS_STORAGE_KEY = "chain-brief-community-posts";
export const COMMUNITY_POSTS_CHANGED_EVENT = "chain-brief-community-posts-changed";
export const COMMUNITY_QUOTE_STORAGE_KEY = "chain-brief-community-quote";
export const COMMUNITY_QUOTE_CHANGED_EVENT = "chain-brief-community-quote-changed";

export type CommunityPostKind = "opinion" | "repost" | "quote" | "thread_quote" | "thread_repost";

export type QuotedCommunityPostSnapshot = {
  id: string;
  title: string;
  author: string;
  preview: string;
  stance?: CommunityStance;
  publishedAt: string;
  category: string;
  attachments?: CommunityAttachment[];
};
export type CommunityStance = "Bullish" | "Bearish" | "Neutral" | "Question";
export type CommunityAttachmentKind = "image" | "video";

export type CommunityAttachment = {
  id: string;
  kind: CommunityAttachmentKind;
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
};

export type CommunityPostType =
  | "general"
  | "news_interpretation"
  | "chart_analysis"
  | "trade_review"
  | "loss_review"
  | "risk_analysis";

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
  postType?: CommunityPostType;
  analystTier?: "user" | "rookie_analyst" | "rising_analyst" | "verified_analyst" | "partner_expert";
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
  attachments?: CommunityAttachment[];
  quotedCommunityPost?: QuotedCommunityPostSnapshot;
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
    return [];
  }

  const stored = window.localStorage.getItem(COMMUNITY_POSTS_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed
          .map(normalizeCommunityPost)
          .filter((post): post is CommunityPost => Boolean(post))
          .sort(sortPostsNewestFirst)
      : [];
  } catch {
    return [];
  }
}

export function writeCommunityPosts(posts: CommunityPost[]) {
  if (typeof window === "undefined") {
    return;
  }

  const nextPosts = posts.slice(0, 100).sort(sortPostsNewestFirst);

  const trySet = (data: CommunityPost[]) => {
    window.localStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, JSON.stringify(data));
  };

  try {
    trySet(nextPosts);
  } catch {
    // Quota exceeded — keep attachments on the 5 most recent, strip the rest
    try {
      const stripped = nextPosts.map((p, i) =>
        i < 5 ? p : { ...p, attachments: [] as CommunityAttachment[] },
      );
      trySet(stripped);
    } catch {
      // Still failing — strip all attachment data
      try {
        trySet(nextPosts.map((p) => ({ ...p, attachments: [] as CommunityAttachment[] })));
      } catch {
        // Nothing we can do; storage is full
      }
    }
  }

  window.dispatchEvent(new CustomEvent(COMMUNITY_POSTS_CHANGED_EVENT, { detail: nextPosts }));
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
    postType?: CommunityPostType;
    analystTier?: CommunityPost["analystTier"];
    relatedArticleSlug?: string;
    relatedArticleTitle?: string;
    relatedArticleSource?: string;
    relatedArticleUrl?: string;
    attachments?: CommunityAttachment[];
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
    postType: options?.postType ?? "general",
    analystTier: options?.analystTier,
    topic,
    stance: options?.stance ?? "Neutral",
    discussionType: options?.discussionType ?? "opinion",
    relatedArticleSlug: options?.relatedArticleSlug,
    relatedArticleTitle: options?.relatedArticleTitle,
    relatedArticleSource: options?.relatedArticleSource,
    relatedArticleUrl: options?.relatedArticleUrl,
    attachments: options?.attachments ?? [],
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
    postType: "news_interpretation",
    analystTier: options?.author ? undefined : "rookie_analyst",
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

export function addThreadRepost(originalPost: CommunityPost, options?: { author?: string }) {
  const snapshot: QuotedCommunityPostSnapshot = {
    id: originalPost.id,
    title: originalPost.title,
    author: originalPost.author,
    preview: originalPost.preview,
    stance: originalPost.stance,
    publishedAt: originalPost.publishedAt,
    category: originalPost.category,
    attachments: originalPost.attachments,
  };

  const nextPost: CommunityPost = {
    id: createPostId(),
    slug: slugify(`repost-${originalPost.slug}`),
    title: originalPost.title,
    body: originalPost.body,
    preview: originalPost.preview,
    author: options?.author ?? "You",
    avatar: "CB",
    category: originalPost.category,
    publishedAt: new Date().toISOString(),
    likes: 0,
    commentsCount: 0,
    views: 0,
    tags: originalPost.tags,
    createdAt: new Date().toISOString(),
    kind: "thread_repost",
    postType: originalPost.postType,
    stance: originalPost.stance,
    topic: originalPost.topic,
    quotedCommunityPost: snapshot,
  };

  const nextPosts = [nextPost, ...readCommunityPosts()];
  writeCommunityPosts(nextPosts);
  return nextPost;
}

export function addThreadQuote(
  body: string,
  originalPost: CommunityPost,
  options?: { stance?: CommunityStance; author?: string },
) {
  const snapshot: QuotedCommunityPostSnapshot = {
    id: originalPost.id,
    title: originalPost.title,
    author: originalPost.author,
    preview: originalPost.preview,
    stance: originalPost.stance,
    publishedAt: originalPost.publishedAt,
    category: originalPost.category,
    attachments: originalPost.attachments,
  };

  const trimmed = body.trim();
  const nextPost: CommunityPost = {
    id: createPostId(),
    slug: slugify(`quote-${originalPost.slug}-${truncate(trimmed, 40)}`),
    title: truncate(trimmed, 70) || `Thoughts on "${originalPost.title}"`,
    body: trimmed,
    preview: truncate(trimmed, 120),
    author: options?.author ?? "You",
    avatar: "CB",
    category: originalPost.category,
    publishedAt: new Date().toISOString(),
    likes: 0,
    commentsCount: 0,
    views: 0,
    tags: originalPost.tags,
    createdAt: new Date().toISOString(),
    kind: "thread_quote",
    postType: "general",
    stance: options?.stance ?? "Neutral",
    topic: originalPost.topic,
    quotedCommunityPost: snapshot,
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
    postType: "news_interpretation",
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
    (post.kind === "opinion" || post.kind === "repost" || post.kind === "quote" || post.kind === "thread_quote" || post.kind === "thread_repost")
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
    kind:
      post.kind === "repost" ||
      post.kind === "quote" ||
      post.kind === "thread_quote" ||
      post.kind === "thread_repost"
        ? post.kind
        : "opinion",
    postType: post.postType,
    analystTier: post.analystTier,
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
    attachments: normalizeAttachments(post.attachments),
    quotedCommunityPost: normalizeQuotedSnapshot(post.quotedCommunityPost),
  };
}

function normalizeAttachments(value: unknown): CommunityAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const attachment = item as Partial<CommunityAttachment>;
      if (
        typeof attachment.id !== "string" ||
        typeof attachment.name !== "string" ||
        typeof attachment.mimeType !== "string" ||
        typeof attachment.dataUrl !== "string" ||
        typeof attachment.size !== "number"
      ) {
        return null;
      }

      if (attachment.kind !== "image" && attachment.kind !== "video") {
        return null;
      }

      return {
        id: attachment.id,
        kind: attachment.kind,
        name: attachment.name,
        mimeType: attachment.mimeType,
        dataUrl: attachment.dataUrl,
        size: attachment.size,
      } satisfies CommunityAttachment;
    })
    .filter((item): item is CommunityAttachment => Boolean(item));
}

function normalizeQuotedSnapshot(value: unknown): QuotedCommunityPostSnapshot | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const snap = value as Partial<QuotedCommunityPostSnapshot>;
  if (
    typeof snap.id !== "string" ||
    typeof snap.title !== "string" ||
    typeof snap.author !== "string" ||
    typeof snap.preview !== "string" ||
    typeof snap.publishedAt !== "string" ||
    typeof snap.category !== "string"
  ) {
    return undefined;
  }

  return {
    id: snap.id,
    title: snap.title,
    author: snap.author,
    preview: snap.preview,
    stance: snap.stance,
    publishedAt: snap.publishedAt,
    category: snap.category,
    attachments: normalizeAttachments(snap.attachments),
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

// Community feed starts empty and fills with real user posts.
