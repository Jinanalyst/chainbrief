import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Container } from "@/components/ui/container";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { INSIGHT_CATEGORIES, type Insight } from "@/lib/insights";
import { renderMarkdown } from "@/lib/markdown";
import { looksLikeHtml, sanitizeHtml } from "@/lib/sanitize-html";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default async function InsightReader({ params }: { params: Params }) {
  const { slug } = await params;
  if (!hasSupabaseConfig) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("cb_insights")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const insight = data as Insight | null;
  // Drafts: only render if author is the viewer.
  if (!insight) notFound();

  if (insight.status !== "published") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== insight.author_id) notFound();
  }

  const html = looksLikeHtml(insight.body)
    ? sanitizeHtml(insight.body)
    : renderMarkdown(insight.body);
  const categoryLabel =
    INSIGHT_CATEGORIES.find((c) => c.value === insight.category)?.label ?? insight.category;

  return (
    <main className="site-grid min-h-screen">
      <Header />
      <Container className="py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/insights" className="text-xs font-semibold text-muted hover:text-ink">
            ← Back to insights
          </Link>
          <div className="mt-4 mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-accent">
            <span>{categoryLabel}</span>
            {insight.status !== "published" ? (
              <span className="rounded-full bg-tint/10 px-2 py-0.5 text-muted">Draft</span>
            ) : null}
            <span className="text-muted">·</span>
            <span className="text-muted">{formatDate(insight.published_at ?? insight.created_at)}</span>
          </div>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{insight.title}</h1>
          {insight.excerpt ? (
            <p className="mt-3 text-base text-muted">{insight.excerpt}</p>
          ) : null}
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
