import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Container } from "@/components/ui/container";
import { InsightReaderHeader } from "@/components/insights/insight-reader-header";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { type Insight } from "@/lib/insights";
import { renderMarkdown } from "@/lib/markdown";
import { looksLikeHtml, sanitizeHtml } from "@/lib/sanitize-html";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

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

  return (
    <main className="site-grid min-h-screen">
      <Header />
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
