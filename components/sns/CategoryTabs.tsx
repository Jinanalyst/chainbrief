"use client";

import { cn } from "@/lib/cn";
import type { Language } from "@/lib/i18n";
import type { SnsCategory } from "@/lib/sns/types";

type CategoryTabsProps = {
  activeCategory: string;
  categories: string[];
  counts: Record<string, number>;
  language: Language;
  onChange: (category: string) => void;
};

const SNS_CATEGORY_LABELS: Record<Language, Partial<Record<SnsCategory, string>>> = {
  ko: {
    All: "전체",
    Research: "리서치",
    Macro: "매크로",
    Bitcoin: "비트코인",
    Ethereum: "이더리움",
    Solana: "솔라나",
    Security: "보안",
    "AI & Crypto": "AI & 크립토",
  },
  en: {
    All: "All",
    Research: "Research",
    Macro: "Macro",
    Bitcoin: "Bitcoin",
    Ethereum: "Ethereum",
    Solana: "Solana",
    Security: "Security",
    "AI & Crypto": "AI & Crypto",
  },
};

export function getCategoryLabel(category: string, language: Language) {
  return SNS_CATEGORY_LABELS[language][category as SnsCategory] ?? category;
}

export function CategoryTabs({
  activeCategory,
  categories,
  counts,
  language,
  onChange,
}: CategoryTabsProps) {
  return (
    <div className="mt-5 max-w-full overflow-x-auto overscroll-x-contain border-b border-tint/10 [-webkit-overflow-scrolling:touch]">
      <div className="flex w-max min-w-full gap-1">
        {categories.map((category) => (
          <button
            className={cn(
              "shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition",
              activeCategory === category
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
            key={category}
            onClick={() => onChange(category)}
            type="button"
          >
            {getCategoryLabel(category, language)} ({counts[category] ?? 0})
          </button>
        ))}
      </div>
    </div>
  );
}
