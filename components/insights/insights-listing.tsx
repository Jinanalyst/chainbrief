"use client";

import Link from "next/link";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
import {
  INSIGHT_CATEGORIES,
  type Insight,
  type InsightCategory,
} from "@/lib/insights";

type Props = {
  insights: Insight[];
  selected: InsightCategory | null;
  canAuthor: boolean;
};

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function InsightsListing({ insights, selected, canAuthor }: Props) {
  const [preferences] = usePreferences();
  const { t } = useI18n(preferences.language);
  const i = t.insights;
  const locale = preferences.language === "ko" ? "ko-KR" : "en-US";

  const categoryLabel = (value: InsightCategory): string => {
    switch (value) {
      case "education": return i.categoryEducation;
      case "crypto": return i.categoryCrypto;
      case "stocks": return i.categoryStocks;
      case "macro": return i.categoryMacro;
    }
  };

  const tabs: { value: InsightCategory | "all"; label: string; href: string }[] = [
    { value: "all", label: i.categoryAll, href: "/insights" },
    ...INSIGHT_CATEGORIES.map((c) => ({
      value: c.value,
      label: categoryLabel(c.value),
      href: `/insights?category=${c.value}`,
    })),
  ];
  const active: string = selected ?? "all";

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            {i.eyebrow}
          </p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{i.title}</h1>
          <p className="max-w-2xl text-sm text-muted">{i.subtitle}</p>
        </div>
        {canAuthor ? (
          <Link
            href="/insights/studio"
            className="shrink-0 self-start rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(47,123,255,0.28)] hover:bg-blue-500 sm:self-end"
          >
            {i.writeStudio}
          </Link>
        ) : null}
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
          {i.empty}
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
                  <span className="text-muted">{formatDate(post.published_at, locale)}</span>
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
    </>
  );
}
