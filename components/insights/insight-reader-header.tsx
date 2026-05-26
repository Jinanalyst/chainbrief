"use client";

import Link from "next/link";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
import { type Insight, type InsightCategory } from "@/lib/insights";

type Props = {
  insight: Insight;
};

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function InsightReaderHeader({ insight }: Props) {
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

  return (
    <>
      <Link href="/insights" className="text-xs font-semibold text-muted hover:text-ink">
        {i.back}
      </Link>
      <div className="mt-4 mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-accent">
        <span>{categoryLabel(insight.category)}</span>
        {insight.status !== "published" ? (
          <span className="rounded-full bg-tint/10 px-2 py-0.5 text-muted">{i.statusDraft}</span>
        ) : null}
        <span className="text-muted">·</span>
        <span className="text-muted">
          {formatDate(insight.published_at ?? insight.created_at, locale)}
        </span>
      </div>
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">{insight.title}</h1>
      {insight.excerpt ? (
        <p className="mt-3 text-base text-muted">{insight.excerpt}</p>
      ) : null}
    </>
  );
}
