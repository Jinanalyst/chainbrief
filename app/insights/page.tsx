import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Container } from "@/components/ui/container";
import { InsightsListing } from "@/components/insights/insights-listing";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  isInsightAuthor,
  isInsightCategory,
  type Insight,
  type InsightCategory,
} from "@/lib/insights";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insights — Long-Form Market Research",
  description:
    "Long-form analyst insights on crypto, stocks, and macro. Deep-dive research, frameworks, and chart notes from Chain Brief analysts.",
  alternates: { canonical: "/insights" },
  openGraph: {
    title: "Chain Brief Insights",
    description:
      "Long-form analyst insights on crypto, stocks, and macro from Chain Brief.",
    url: "/insights",
    type: "website",
  },
};

type SearchParams = Promise<{ category?: string }>;

async function loadInsights(category: InsightCategory | null): Promise<Insight[]> {
  if (!hasSupabaseConfig) return [];
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let q = supabase
    .from("cb_insights")
    .select("*")
    .or(`status.eq.published,and(status.eq.scheduled,published_at.lte.${nowIso})`)
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

  let canAuthor = false;
  if (hasSupabaseConfig) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    canAuthor = isInsightAuthor(user?.email);
  }

  return (
    <main className="site-grid min-h-screen">
      <Header />
      <Container className="py-10">
        <InsightsListing insights={insights} selected={selected} canAuthor={canAuthor} />
      </Container>
    </main>
  );
}
