import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Container } from "@/components/ui/container";
import { InsightReaderHeader } from "@/components/insights/insight-reader-header";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { type Insight, isLivePublished } from "@/lib/insights";
import { renderMarkdown } from "@/lib/markdown";
import { looksLikeHtml, sanitizeHtml } from "@/lib/sanitize-html";

export const dynamic = "force-dynamic";

const SITE_URL = "https://chainbrief.kr";

type Params = Promise<{ slug: string }>;

function normalizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

async function loadInsight(slug: string): Promise<Insight | null> {
  if (!hasSupabaseConfig) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cb_insights")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (data) return data as Insight;

    const target = normalizeSlug(slug);
    if (!target) return null;
    const { data: all } = await supabase
      .from("cb_insights")
      .select("*");
    const match = ((all ?? []) as Insight[]).find(
      (row) => normalizeSlug(row.slug) === target,
    );
    return match ?? null;
  } catch {
    return null;
  }
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDescription(insight: Insight): string {
  const raw = insight.excerpt && insight.excerpt.trim().length > 0 ? insight.excerpt : stripHtml(insight.body).slice(0, 220);
  return raw.length > 200 ? `${raw.slice(0, 197)}...` : raw;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const insight = await loadInsight(slug);
  if (!insight || !isLivePublished(insight)) {
    return {
      title: "Insight not found",
      robots: { index: false, follow: false },
    };
  }
  const description = buildDescription(insight);
  const url = `${SITE_URL}/insights/${insight.slug}`;
  const ogImages = insight.cover_image_url ? [{ url: insight.cover_image_url }] : undefined;
  return {
    title: insight.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: insight.title,
      description,
      siteName: "Chain Brief",
      locale: "ko_KR",
      publishedTime: insight.published_at ?? insight.created_at,
      modifiedTime: insight.updated_at,
      section: insight.category,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: insight.title,
      description,
      images: insight.cover_image_url ? [insight.cover_image_url] : undefined,
    },
  };
}

export default async function InsightReader({ params }: { params: Params }) {
  const { slug } = await params;
  if (!hasSupabaseConfig) notFound();

  const insight = await loadInsight(slug);
  if (!insight) notFound();
  if (insight.slug !== slug) {
    redirect(`/insights/${encodeURIComponent(insight.slug)}`);
  }

  const supabase = await createClient();

  if (!isLivePublished(insight)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== insight.author_id) notFound();
  }

  const html = looksLikeHtml(insight.body)
    ? sanitizeHtml(insight.body)
    : renderMarkdown(insight.body);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: insight.title,
    description: buildDescription(insight),
    image: insight.cover_image_url ? [insight.cover_image_url] : undefined,
    datePublished: insight.published_at ?? insight.created_at,
    dateModified: insight.updated_at,
    inLanguage: "ko-KR",
    articleSection: insight.category,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/insights/${insight.slug}`,
    },
    publisher: {
      "@type": "Organization",
      name: "Chain Brief",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
    },
    author: {
      "@type": "Organization",
      name: "Chain Brief",
    },
  };

  return (
    <main className="site-grid min-h-screen">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Container className="py-10">
        <div className="mx-auto max-w-3xl">
          <InsightReaderHeader insight={insight} />
          {insight.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={insight.cover_image_url}
              alt=""
              className="mt-6 aspect-[16/9] w-full rounded-lg object-cover"
            />
          ) : null}
          <article
            className="prose-insight mt-8 text-[15px] leading-7 text-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </Container>
    </main>
  );
}
