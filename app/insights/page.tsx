import Link from "next/link";
import { Header } from "@/components/header";
import { Container } from "@/components/ui/container";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  INSIGHT_CATEGORIES,
  isInsightCategory,
  type Insight,
  type InsightCategory,
} from "@/lib/insights";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string }>;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

async function loadInsights(category: InsightCategory | null): Promise<Insight[]> {
  if (!hasSupabaseConfig) return [];
  const supabase = await createClient();
  let q = supabase
    .from("cb_insights")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (category) q = q.eq("category", category);
  const { data } = await q;
  return (data ?? []) as Insight[];
}

export default async function InsightsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const selected: InsightCategory | null = isInsightCategory(params.category)
    ? params.category
    : null;
  const insights = await loadInsights(selected);

  const tabs: { value: InsightCategory | "all"; label: string; href: string }[] = [
    { value: "all", label: "All", href: "/insights" },
    ...INSIGHT_CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      href: `/insights?category=${c.value}`,
    })),
  ];
  const active: string = selected ?? "all";

  return (
    <main className="site-grid min-h-screen">
      <Header />
      <Container className="py-10">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Insights</p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">
            Notes from the desk
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Personal commentary on the macro environment, crypto markets, equities, and the
            mental models behind them. Filter by category to find what matters to you.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = active === tab.value;
            return (
              <Link
                key={tab.value}
                href={tab.href}
                className={
                  "rounded-full border px-4 py-1.5 text-xs font-semibold transition " +
                  (isActive
                    ? "border-accent bg-accent text-white"
                    : "border-tint/15 bg-tint/[0.04] text-muted hover:text-ink")
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {insights.length === 0 ? (
          <div className="rounded-lg border border-dashed border-tint/20 bg-tint/[0.03] p-10 text-center text-sm text-muted">
            No insights published yet in this category.
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {insights.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/insights/${post.slug}`}
                  className="flex h-full flex-col gap-3 rounded-lg border border-tint/10 bg-tint/[0.03] p-5 transition hover:border-accent/50 hover:bg-tint/[0.06]"
                >
                  {post.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="aspect-[16/9] w-full rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
                    <span>{categoryLabel(post.category)}</span>
                    <span className="text-muted">·</span>
                    <span className="text-muted">{formatDate(post.published_at)}</span>
                  </div>
                  <h2 className="text-lg font-bold text-ink">{post.title}</h2>
                  {post.excerpt ? (
                    <p className="text-sm text-muted line-clamp-3">{post.excerpt}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}

function categoryLabel(value: InsightCategory): string {
  return INSIGHT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
