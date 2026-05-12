import { cn } from "@/lib/cn";
import type { Language } from "@/lib/i18n";
import { SNS_CATEGORIES } from "@/lib/sns/sources";
import type { SnsCategory } from "@/lib/sns/types";

type CategoryTabsProps = {
  activeCategory: SnsCategory;
  counts: Record<SnsCategory, number>;
  language: Language;
  onChange: (category: SnsCategory) => void;
};

const SNS_CATEGORY_LABELS: Record<Language, Record<SnsCategory, string>> = {
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

export function CategoryTabs({
  activeCategory,
  counts,
  language,
  onChange,
}: CategoryTabsProps) {
  return (
    <div className="mt-5 max-w-full overflow-x-auto overscroll-x-contain border-b border-white/10 [-webkit-overflow-scrolling:touch]">
      <div className="flex w-max min-w-full gap-1">
        {SNS_CATEGORIES.map((category) => (
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
            {SNS_CATEGORY_LABELS[language][category]} ({counts[category] ?? 0})
          </button>
        ))}
      </div>
    </div>
  );
}
