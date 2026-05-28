import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

const SITE_URL = "https://chainbrief.kr";

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "", changeFrequency: "daily", priority: 1.0 },
  { path: "/briefs", changeFrequency: "hourly", priority: 0.9 },
  { path: "/insights", changeFrequency: "daily", priority: 0.9 },
  { path: "/community", changeFrequency: "hourly", priority: 0.8 },
  { path: "/analysts", changeFrequency: "daily", priority: 0.8 },
  { path: "/analytics", changeFrequency: "weekly", priority: 0.6 },
  { path: "/market", changeFrequency: "hourly", priority: 0.8 },
  { path: "/membership", changeFrequency: "monthly", priority: 0.5 },
  { path: "/sns", changeFrequency: "daily", priority: 0.6 },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  if (!hasSupabaseConfig) return entries;

  try {
    const supabase = await createClient();
    const { data: insights } = await supabase
      .from("cb_insights")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5000);

    if (insights) {
      for (const row of insights as Array<{ slug: string; updated_at: string | null; published_at: string | null }>) {
        if (!row.slug) continue;
        entries.push({
          url: `${SITE_URL}/insights/${row.slug}`,
          lastModified: row.updated_at ? new Date(row.updated_at) : row.published_at ? new Date(row.published_at) : now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // ignore — return whatever static entries we have
  }

  return entries;
}
