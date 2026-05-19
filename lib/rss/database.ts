import type { SupabaseClient } from "@supabase/supabase-js";
import type { Article } from "@/lib/rss/types";

type BriefArticleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  ai_summary: string | null;
  source_id: string;
  source_name: string;
  category: string;
  published_at: string;
  thumbnail_url: string | null;
  original_url: string;
  tags: string[] | null;
  market_impact: Article["marketImpact"] | null;
  raw_content_snippet: string | null;
  feed_category: string | null;
  bull_count?: number | null;
  bear_count?: number | null;
};

export async function fetchStoredBriefArticles(
  supabase: SupabaseClient,
  limit = 120,
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("brief_articles_with_reactions")
    .select(
      "id, slug, title, summary, ai_summary, source_id, source_name, category, published_at, thumbnail_url, original_url, tags, market_impact, raw_content_snippet, feed_category, bull_count, bear_count",
    )
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as BriefArticleRow[]).map(articleFromRow);
}

export async function upsertBriefArticles(
  supabase: SupabaseClient,
  articles: Article[],
) {
  if (articles.length === 0) {
    return { inserted: 0 };
  }

  const { error } = await supabase.from("brief_articles").upsert(
    articles.map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.excerpt,
      ai_summary: article.briefSummary,
      source_id: article.sourceId,
      source_name: article.sourceName,
      category: article.category,
      published_at: article.publishedAt,
      thumbnail_url: article.imageUrl ?? null,
      original_url: article.originalUrl,
      tags: article.tags,
      market_impact: article.marketImpact ?? "Neutral",
      raw_content_snippet: article.rawContentSnippet,
      feed_category: article.feedCategory ?? article.category,
    })),
    { onConflict: "original_url", ignoreDuplicates: false },
  );

  if (error) {
    throw error;
  }

  return { inserted: articles.length };
}

function articleFromRow(row: BriefArticleRow): Article {
  const excerpt = row.summary ?? row.raw_content_snippet ?? "";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    sourceId: row.source_id,
    sourceName: row.source_name,
    originalUrl: row.original_url,
    publishedAt: row.published_at,
    excerpt,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    readingTime: estimateReadingTime(excerpt || row.title),
    briefSummary: row.ai_summary ?? excerpt,
    rawContentSnippet: row.raw_content_snippet ?? excerpt,
    imageUrl: row.thumbnail_url ?? undefined,
    marketImpact: row.market_impact ?? "Neutral",
    bullCount: row.bull_count ?? 0,
    bearCount: row.bear_count ?? 0,
    feedCategory: row.feed_category ?? row.category,
  };
}

function estimateReadingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}
