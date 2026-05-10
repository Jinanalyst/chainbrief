import { cn } from "@/lib/cn";
import { SNS_CATEGORIES } from "@/lib/sns/sources";
import type { SnsCategory } from "@/lib/sns/types";

type CategoryTabsProps = {
  activeCategory: SnsCategory;
  counts: Record<SnsCategory, number>;
  onChange: (category: SnsCategory) => void;
};

export function CategoryTabs({
  activeCategory,
  counts,
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
            {category} ({counts[category] ?? 0})
          </button>
        ))}
      </div>
    </div>
  );
}
