import type { Article } from "@/lib/rss/types";

export const COMMUNITY_POSTS_STORAGE_KEY = "chain-brief-community-posts";
export const COMMUNITY_POSTS_CHANGED_EVENT = "chain-brief-community-posts-changed";
export const COMMUNITY_QUOTE_STORAGE_KEY = "chain-brief-community-quote";
export const COMMUNITY_QUOTE_CHANGED_EVENT = "chain-brief-community-quote-changed";
export const COMMUNITY_AUTHOR_NAME_KEY = "chain-brief-author-name";
export const ARTICLE_SENTIMENT_STORAGE_KEY = "chain-brief-article-sentiment";
export const ARTICLE_SENTIMENT_CHANGED_EVENT = "chain-brief-article-sentiment-changed";

/** Read the saved community author name from localStorage. */
export function readAuthorName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(COMMUNITY_AUTHOR_NAME_KEY)?.trim() ?? "";
}

/** Persist the author name to localStorage. */
export function writeAuthorName(name: string) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) {
    window.localStorage.setItem(COMMUNITY_AUTHOR_NAME_KEY, trimmed);
  } else {
    window.localStorage.removeItem(COMMUNITY_AUTHOR_NAME_KEY);
  }
}

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

export type CommunityReply = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  likes: number;
  parentId?: string;
};

export type ArticleReaction = "Bullish" | "Bearish";

export type ArticleSentiment = {
  articleSlug: string;
  bull: number;
  bear: number;
  userReaction?: ArticleReaction;
  opinions: Array<{
    id: string;
    body: string;
    author: string;
    reaction: ArticleReaction;
    createdAt: string;
  }>;
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
  authorId?: string;
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
  replies?: CommunityReply[];
  likedByUser?: boolean;
};

export type CommunityEngagementMetrics = {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  bull: number;
  bear: number;
  rebriefs: number;
  quoteAnalyses: number;
  likedByUser: boolean;
  savedByUser: boolean;
  userReaction?: "bull" | "bear";
};

export type DatabaseCommunityPostRow = {
  id: string;
  author_id?: string | null;
  title: string;
  body: string;
  category: string;
  post_type?: string | null;
  coin_tags?: string[] | null;
  linked_news_id?: string | null;
  quoted_post_id?: string | null;
  quote_kind?: "rebrief" | "quote_analysis" | null;
  status?: string | null;
  view_count?: number | null;
  created_at: string;
  updated_at?: string | null;
  profiles?:
    | {
        username?: string | null;
        avatar_url?: string | null;
        role?: CommunityPost["analystTier"] | "admin" | null;
      }
    | Array<{
        username?: string | null;
        avatar_url?: string | null;
        role?: CommunityPost["analystTier"] | "admin" | null;
      }>
    | null;
  metadata?: Record<string, unknown> | null;
  post_attachments?: Array<{
    id: string;
    kind: "image" | "video";
    name?: string | null;
    mime_type?: string | null;
    data_url: string;
    size?: number | null;
    position?: number | null;
  }> | null;
};

export type DatabaseCommunityCommentRow = {
  id: string;
  post_id: string;
  user_id?: string | null;
  parent_comment_id?: string | null;
  body: string;
  created_at: string;
  updated_at?: string | null;
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

export function toggleCommunityPostLike(postId: string) {
  const nextPosts = readCommunityPosts().map((post) => {
    if (post.id !== postId) return post;

    const likedByUser = !post.likedByUser;
    return {
      ...post,
      likedByUser,
      likes: Math.max(0, post.likes + (likedByUser ? 1 : -1)),
    };
  });

  writeCommunityPosts(nextPosts);
}

export function addCommunityPostReply(
  postId: string,
  body: string,
  author = "You",
  parentId?: string,
) {
  const trimmed = body.trim();
  if (!trimmed) return null;

  let reply: CommunityReply | null = null;
  const nextPosts = readCommunityPosts().map((post) => {
    if (post.id !== postId) return post;

    const nextReply: CommunityReply = {
      id: createPostId(),
      body: trimmed,
      author,
      createdAt: new Date().toISOString(),
      likes: 0,
      parentId,
    };
    reply = nextReply;

    return {
      ...post,
      commentsCount: post.commentsCount + 1,
      replies: [...(post.replies ?? []), nextReply],
    };
  });

  writeCommunityPosts(nextPosts);
  return reply;
}

export function readArticleSentiments(): Record<string, ArticleSentiment> {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = window.localStorage.getItem(ARTICLE_SENTIMENT_STORAGE_KEY);
  if (!stored) return {};

  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([slug, value]) => [slug, normalizeArticleSentiment(slug, value)] as const)
        .filter(([, value]) => Boolean(value)),
    ) as Record<string, ArticleSentiment>;
  } catch {
    return {};
  }
}

export function readArticleSentiment(articleSlug: string): ArticleSentiment {
  return (
    readArticleSentiments()[articleSlug] ?? {
      articleSlug,
      bull: 0,
      bear: 0,
      opinions: [],
    }
  );
}

export function reactToArticle(
  article: Article,
  reaction: ArticleReaction,
  options?: {
    opinion?: string;
    author?: string;
  },
) {
  const sentiments = readArticleSentiments();
  const current = sentiments[article.slug] ?? {
    articleSlug: article.slug,
    bull: 0,
    bear: 0,
    opinions: [],
  };
  const previousReaction = current.userReaction;
  const opinion = options?.opinion?.trim() ?? "";
  const next: ArticleSentiment = {
    ...current,
    bull: Math.max(0, current.bull - (previousReaction === "Bullish" ? 1 : 0)) + (reaction === "Bullish" ? 1 : 0),
    bear: Math.max(0, current.bear - (previousReaction === "Bearish" ? 1 : 0)) + (reaction === "Bearish" ? 1 : 0),
    userReaction: reaction,
    opinions: opinion
      ? [
          {
            id: createPostId(),
            body: opinion,
            author: options?.author ?? "You",
            reaction,
            createdAt: new Date().toISOString(),
          },
          ...current.opinions,
        ].slice(0, 8)
      : current.opinions,
  };

  sentiments[article.slug] = next;
  writeArticleSentiments(sentiments, next);

  if (opinion) {
    addQuotePost(opinion, articleToQuoteTarget(article), {
      author: options?.author ?? "You",
      stance: reaction,
      title: `${reaction === "Bullish" ? "Bull case" : "Bear case"}: ${article.title}`,
    });
  }

  return next;
}

// Fire-and-forget POST to the community API so the post lives in Supabase, not just localStorage.
// Silently no-ops when called server-side, when the user isn't signed in, or when the request fails;
// the localStorage copy already shows the post optimistically in the current browser.
export function persistPostToSupabase(post: CommunityPost): void {
  if (typeof window === "undefined") return;

  // Everything that doesn't map to a dedicated public.posts column lives in the
  // metadata jsonb so the post round-trips losslessly through Supabase.
  const metadata: Record<string, unknown> = {
    stance: post.stance,
    discussionType: post.discussionType,
    analystTier: post.analystTier,
    kind: post.kind,
    topic: post.topic,
    author: post.author,
    avatar: post.avatar,
    relatedArticleSlug: post.relatedArticleSlug,
    relatedArticleTitle: post.relatedArticleTitle,
    relatedArticleSource: post.relatedArticleSource,
    relatedArticleUrl: post.relatedArticleUrl,
    quotedCommunityPost: post.quotedCommunityPost,
  };
  // Strip undefined so the jsonb stays compact
  for (const key of Object.keys(metadata)) {
    if (metadata[key] === undefined) delete metadata[key];
  }

  const attachments = (post.attachments ?? []).map((a) => ({
    kind: a.kind,
    name: a.name,
    mime_type: a.mimeType,
    data_url: a.dataUrl,
    size: a.size,
  }));

  // Map our thread_* kinds to the codex quote_kind enum.
  const quoteKind =
    post.kind === "thread_repost" ? "rebrief" :
    post.kind === "thread_quote" || post.kind === "quote" ? "quote_analysis" : null;

  const payload = {
    title: post.title,
    body: post.body,
    category: post.category,
    post_type: post.postType ?? "general",
    coin_tags: post.tags ?? [],
    linked_news_id: post.relatedArticleSlug ?? null,
    metadata,
    attachments,
    quoted_post_id: post.quotedCommunityPost?.id ?? null,
    quote_kind: quoteKind,
  };

  void fetch("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  }).catch(() => undefined);
}

export function communityPostFromDatabase(row: DatabaseCommunityPostRow): CommunityPost {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const postType = normalizePostType(row.post_type);
  const tags = Array.isArray(row.coin_tags)
    ? row.coin_tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim()))
    : [];

  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  const author = str(metadata.author) || profile?.username?.trim() || "Chain Brief member";
  const avatar = profile?.avatar_url || str(metadata.avatar) || avatarFromName(author);

  const stanceValue = str(metadata.stance) as CommunityStance | undefined;
  const stance: CommunityStance =
    stanceValue && (["Bullish", "Bearish", "Neutral", "Question"] as const).includes(stanceValue as CommunityStance)
      ? (stanceValue as CommunityStance)
      : inferStance(row.title, row.body);

  const analystTier =
    normalizeAnalystTier(str(metadata.analystTier) ?? null) ?? normalizeAnalystTier(profile?.role);

  const kindValue = str(metadata.kind);
  const kind: CommunityPostKind =
    kindValue === "repost" || kindValue === "quote" || kindValue === "thread_quote" || kindValue === "thread_repost"
      ? (kindValue as CommunityPostKind)
      : "opinion";

  const discussionType =
    (str(metadata.discussionType) as CommunityPost["discussionType"] | undefined) ??
    (row.linked_news_id ? "news_reaction" : postType === "chart_analysis" ? "analysis" : "opinion");

  const attachments = Array.isArray(row.post_attachments)
    ? row.post_attachments
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map<CommunityAttachment>((a) => ({
          id: a.id,
          kind: a.kind === "video" ? "video" : "image",
          name: a.name ?? "",
          mimeType: a.mime_type ?? "",
          dataUrl: a.data_url,
          size: a.size ?? 0,
        }))
    : undefined;

  const quotedSnapshot = metadata.quotedCommunityPost as QuotedCommunityPostSnapshot | undefined;

  return {
    id: row.id,
    slug: slugify(`${row.id}-${row.title}`),
    title: row.title,
    body: row.body,
    preview: truncate(row.body.replace(/\s+/g, " ").trim(), 160),
    author,
    authorId: row.author_id ?? undefined,
    avatar,
    category: row.category || "All",
    publishedAt: row.created_at,
    likes: 0,
    commentsCount: 0,
    views: row.view_count ?? 0,
    tags,
    createdAt: row.created_at,
    kind,
    postType,
    analystTier,
    topic: str(metadata.topic) ?? row.category,
    stance,
    discussionType,
    relatedArticleSlug: row.linked_news_id ?? str(metadata.relatedArticleSlug),
    relatedArticleTitle: str(metadata.relatedArticleTitle),
    relatedArticleSource: str(metadata.relatedArticleSource),
    relatedArticleUrl: str(metadata.relatedArticleUrl),
    attachments,
    quotedCommunityPost: quotedSnapshot && typeof quotedSnapshot === "object" ? quotedSnapshot : undefined,
  };
}

export function databaseInsertFromCommunityPost(post: CommunityPost, authorId: string) {
  return {
    author_id: authorId,
    title: post.title,
    body: post.body,
    category: post.category,
    post_type: post.postType ?? "general",
    coin_tags: post.tags,
    linked_news_id: post.relatedArticleSlug ?? null,
    status: "published",
  };
}

export function mergeCommunityPosts(
  primaryPosts: CommunityPost[],
  secondaryPosts: CommunityPost[],
) {
  const seen = new Set<string>();
  return [...primaryPosts, ...secondaryPosts]
    .filter((post) => {
      const keys = [
        post.id,
        post.slug,
        `${post.author}:${post.title}:${post.body.slice(0, 120)}`,
      ].filter(Boolean);
      if (keys.some((key) => seen.has(key))) return false;
      keys.forEach((key) => seen.add(key));
      return true;
    })
    .sort(sortPostsNewestFirst)
    .slice(0, 120);
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
    tags?: string[];
    preview?: string;
  },
) {
  const title = options?.title ?? buildOpinionTitle(body);
  const tags = normalizeTags([...(options?.tags ?? []), topic ?? ""]);
  const previewSource = options?.preview ?? body;
  const nextPost: CommunityPost = {
    id: createPostId(),
    slug: slugify(`${topic ?? "community"}-${title}`),
    title,
    body: body.trim(),
    preview: truncate(previewSource.trim(), 120),
    author: options?.author ?? "You",
    avatar: options?.avatar ?? "CB",
    category: topic ?? "All",
    publishedAt: new Date().toISOString(),
    likes: 0,
    commentsCount: 0,
    views: 0,
    tags,
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
  void persistPostToSupabase(nextPost);
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
  void persistPostToSupabase(nextPost);
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
  void persistPostToSupabase(nextPost);
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
  void persistPostToSupabase(nextPost);
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
  void persistPostToSupabase(nextPost);
  return nextPost;
}

export function storeCommunityQuoteTarget(article: Article) {
  if (typeof window === "undefined") {
    return;
  }

  const target = articleToQuoteTarget(article);

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

function writeArticleSentiments(
  sentiments: Record<string, ArticleSentiment>,
  changed?: ArticleSentiment,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ARTICLE_SENTIMENT_STORAGE_KEY, JSON.stringify(sentiments));
  window.dispatchEvent(
    new CustomEvent(ARTICLE_SENTIMENT_CHANGED_EVENT, {
      detail: changed ?? sentiments,
    }),
  );
}

function articleToQuoteTarget(article: Article): CommunityQuoteTarget {
  return {
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
    replies: normalizeReplies(post.replies),
    likedByUser: Boolean(post.likedByUser),
  };
}

function normalizePostType(value: unknown): CommunityPostType {
  switch (value) {
    case "news_interpretation":
    case "chart_analysis":
    case "trade_review":
    case "loss_review":
    case "risk_analysis":
      return value;
    default:
      return "general";
  }
}

function normalizeAnalystTier(value: unknown): CommunityPost["analystTier"] | undefined {
  switch (value) {
    case "rookie_analyst":
    case "rising_analyst":
    case "verified_analyst":
    case "partner_expert":
    case "user":
      return value;
    default:
      return undefined;
  }
}

function inferStance(title: string, body: string): CommunityStance {
  const text = `${title} ${body}`.toLowerCase();
  if (/\bbear|bearish|downside|risk|short\b/.test(text)) return "Bearish";
  if (/\bbull|bullish|upside|long\b/.test(text)) return "Bullish";
  if (/\?|\bquestion\b/.test(text)) return "Question";
  return "Neutral";
}

function avatarFromName(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CB";
}

function normalizeArticleSentiment(slug: string, value: unknown): ArticleSentiment | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const sentiment = value as Partial<ArticleSentiment>;
  const userReaction =
    sentiment.userReaction === "Bullish" || sentiment.userReaction === "Bearish"
      ? sentiment.userReaction
      : undefined;
  const opinions = Array.isArray(sentiment.opinions)
    ? sentiment.opinions
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const opinion = item as Partial<ArticleSentiment["opinions"][number]>;
          if (typeof opinion.body !== "string" || !opinion.body.trim()) return null;
          return {
            id: typeof opinion.id === "string" ? opinion.id : createPostId(),
            body: opinion.body,
            author: typeof opinion.author === "string" ? opinion.author : "Community",
            reaction:
              opinion.reaction === "Bearish" || opinion.reaction === "Bullish"
                ? opinion.reaction
                : "Bullish",
            createdAt:
              typeof opinion.createdAt === "string"
                ? opinion.createdAt
                : new Date().toISOString(),
          };
        })
        .filter((item): item is ArticleSentiment["opinions"][number] => Boolean(item))
    : [];

  return {
    articleSlug: typeof sentiment.articleSlug === "string" ? sentiment.articleSlug : slug,
    bull: typeof sentiment.bull === "number" ? sentiment.bull : 0,
    bear: typeof sentiment.bear === "number" ? sentiment.bear : 0,
    userReaction,
    opinions,
  };
}

function normalizeReplies(value: unknown): CommunityReply[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const reply = item as Partial<CommunityReply>;
      if (typeof reply.body !== "string" || !reply.body.trim()) return null;

      const normalized: CommunityReply = {
        id: typeof reply.id === "string" ? reply.id : createPostId(),
        body: reply.body,
        author: typeof reply.author === "string" ? reply.author : "Community",
        createdAt: typeof reply.createdAt === "string" ? reply.createdAt : new Date().toISOString(),
        likes: typeof reply.likes === "number" ? reply.likes : 0,
      };
      if (typeof reply.parentId === "string") normalized.parentId = reply.parentId;
      return normalized;
    })
    .filter((item): item is CommunityReply => item !== null);
}

export function communityReplyFromDatabase(row: DatabaseCommunityCommentRow): CommunityReply {
  const reply: CommunityReply = {
    id: row.id,
    body: row.body,
    author: "Chain Brief member",
    createdAt: row.created_at,
    likes: 0,
  };
  if (row.parent_comment_id) reply.parentId = row.parent_comment_id;
  return reply;
}

export function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .flatMap((tag) => tag.split(","))
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .map((tag) => tag.slice(0, 32))
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (key === "all" || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
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
