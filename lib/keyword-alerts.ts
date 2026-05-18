import type { CommunityPost } from "@/lib/community";
import type { Article } from "@/lib/rss/types";

export type KeywordAlertItem = {
  id: string;
  title: string;
  body: string;
  sourceName: string;
  url: string;
  publishedAt: string;
  kind: "brief" | "breaking" | "community";
};

export function findKeywordMatch(textParts: Array<string | undefined>, keywords: string[]) {
  const normalizedKeywords = keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  if (!normalizedKeywords.length) {
    return null;
  }

  const haystack = textParts.filter(Boolean).join(" ").toLowerCase();
  const match = normalizedKeywords.find((keyword) =>
    haystack.includes(keyword.toLowerCase()),
  );

  return match ?? null;
}

export function findArticleKeywordMatch(article: Article, keywords: string[]) {
  return findKeywordMatch(
    [
      article.title,
      article.briefSummary,
      article.excerpt,
      article.rawContentSnippet,
      article.category,
      article.sourceName,
      ...article.tags,
    ],
    keywords,
  );
}

export function findCommunityKeywordMatch(post: CommunityPost, keywords: string[]) {
  return findKeywordMatch(
    [
      post.title,
      post.body,
      post.preview,
      post.articleTitle,
      post.articleSummary,
      post.relatedArticleTitle,
      post.sourceName,
      ...post.tags,
    ],
    keywords,
  );
}

export function articleToAlertItem(article: Article): KeywordAlertItem {
  return {
    id: article.id,
    title: article.title,
    body: article.briefSummary || article.excerpt,
    sourceName: article.sourceName,
    url: article.originalUrl || "/briefs",
    publishedAt: article.publishedAt,
    kind: isBreakingArticle(article) ? "breaking" : "brief",
  };
}

export function communityPostToAlertItem(post: CommunityPost): KeywordAlertItem {
  return {
    id: post.id,
    title: post.title,
    body: post.preview || post.body,
    sourceName: post.author || "Community",
    url: `/community${post.relatedArticleSlug ? `?articleSlug=${encodeURIComponent(post.relatedArticleSlug)}` : ""}`,
    publishedAt: post.publishedAt,
    kind: "community",
  };
}

function isBreakingArticle(article: Article) {
  const text = [article.title, article.category, ...article.tags]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("breaking") ||
    text.includes("flash") ||
    text.includes("urgent") ||
    text.includes("속보")
  );
}
