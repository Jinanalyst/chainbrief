export const BRIEF_SOURCE_CATEGORY_OVERRIDES_STORAGE_KEY =
  "chain-brief-brief-source-category-overrides";
export const BRIEF_SOURCE_CATEGORY_OVERRIDES_CHANGED_EVENT =
  "chain-brief-brief-source-category-overrides-changed";

const MAX_NAME_LENGTH = 40;

export type BriefSourceCategoryOverrides = Record<string, string>;

export function readBriefSourceCategoryOverrides(): BriefSourceCategoryOverrides {
  if (typeof window === "undefined") return {};
  const stored = window.localStorage.getItem(
    BRIEF_SOURCE_CATEGORY_OVERRIDES_STORAGE_KEY,
  );
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: BriefSourceCategoryOverrides = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key !== "string" || !key.trim()) continue;
      if (typeof value !== "string") continue;
      const trimmed = value.trim().slice(0, MAX_NAME_LENGTH);
      if (!trimmed) continue;
      result[key] = trimmed;
    }
    return result;
  } catch {
    return {};
  }
}

export function writeBriefSourceCategoryOverrides(overrides: BriefSourceCategoryOverrides) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    BRIEF_SOURCE_CATEGORY_OVERRIDES_STORAGE_KEY,
    JSON.stringify(overrides),
  );
  window.dispatchEvent(
    new CustomEvent(BRIEF_SOURCE_CATEGORY_OVERRIDES_CHANGED_EVENT),
  );
}

export function setBriefSourceCategoryOverride(
  sourceId: string,
  category: string | null,
) {
  const current = readBriefSourceCategoryOverrides();
  if (!category || !category.trim()) {
    if (sourceId in current) {
      const { [sourceId]: _removed, ...rest } = current;
      writeBriefSourceCategoryOverrides(rest);
    }
    return;
  }
  current[sourceId] = category.trim().slice(0, MAX_NAME_LENGTH);
  writeBriefSourceCategoryOverrides(current);
}
