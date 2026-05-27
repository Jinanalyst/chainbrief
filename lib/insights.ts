export const INSIGHT_CATEGORIES = [
  { value: "education", label: "Education", labelKo: "교육" },
  { value: "crypto", label: "Crypto", labelKo: "크립토" },
  { value: "stocks", label: "Stocks", labelKo: "주식" },
  { value: "macro", label: "Macro", labelKo: "매크로" },
] as const;

export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number]["value"];

export const INSIGHT_CATEGORY_VALUES = INSIGHT_CATEGORIES.map((c) => c.value) as InsightCategory[];

export function isInsightCategory(value: unknown): value is InsightCategory {
  return typeof value === "string" && (INSIGHT_CATEGORY_VALUES as string[]).includes(value);
}

export type InsightStatus = "draft" | "published" | "scheduled";

// A scheduled insight whose time has arrived is treated as published.
export function isLivePublished(insight: Pick<Insight, "status" | "published_at">): boolean {
  if (insight.status === "published") return true;
  if (insight.status === "scheduled" && insight.published_at) {
    return new Date(insight.published_at).getTime() <= Date.now();
  }
  return false;
}

export type Insight = {
  id: string;
  author_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: InsightCategory;
  cover_image_url: string | null;
  status: InsightStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_AUTHOR_EMAIL = "jangj6091@gmail.com";

export function getInsightAuthorEmails(): string[] {
  const raw = process.env.INSIGHT_AUTHOR_EMAIL ?? DEFAULT_AUTHOR_EMAIL;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isInsightAuthor(email: string | null | undefined): boolean {
  if (!email) return false;
  return getInsightAuthorEmails().includes(email.toLowerCase());
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (base) return base.slice(0, 80);
  return `post-${Date.now().toString(36)}`;
}

export function getCategoryLabel(category: InsightCategory, language: "ko" | "en"): string {
  const found = INSIGHT_CATEGORIES.find((c) => c.value === category);
  if (!found) return category;
  return language === "ko" ? found.labelKo : found.label;
}
