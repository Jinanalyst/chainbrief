import type { Article } from "@/lib/rss/types";

export const COMMUNITY_POSTS_STORAGE_KEY = "chain-brief-community-posts";
export const COMMUNITY_POSTS_CHANGED_EVENT = "chain-brief-community-posts-changed";

export type CommunityPostKind = "opinion" | "repost";

export type CommunityPost = {
  id: string;
  body: string;
  createdAt: string;
  kind: CommunityPostKind;
  topic?: string;
  sourceName?: string;
  articleTitle?: string;
  articleUrl?: string;
  articleCategory?: string;
  articleSummary?: string;
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
      ? parsed.filter(isCommunityPost).sort(sortPostsNewestFirst)
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

export function addOpinionPost(body: string, topic?: string) {
  const nextPost: CommunityPost = {
    id: createPostId(),
    body: body.trim(),
    createdAt: new Date().toISOString(),
    kind: "opinion",
    topic,
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
    body: article.excerpt || article.briefSummary || article.title,
    createdAt: new Date().toISOString(),
    kind: "repost",
    topic: article.category,
    sourceName: article.sourceName,
    articleTitle: article.title,
    articleUrl: article.originalUrl,
    articleCategory: article.category,
    articleSummary: article.briefSummary,
  };

  const nextPosts = [nextPost, ...readCommunityPosts()];
  writeCommunityPosts(nextPosts);
  return nextPost;
}

function sortPostsNewestFirst(a: CommunityPost, b: CommunityPost) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
    typeof post.body === "string" &&
    typeof post.createdAt === "string" &&
    (post.kind === "opinion" || post.kind === "repost")
  );
}
