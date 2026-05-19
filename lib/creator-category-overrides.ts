export const CREATOR_CATEGORY_OVERRIDES_STORAGE_KEY =
  "chain-brief-creator-category-overrides";
export const CREATOR_CATEGORY_OVERRIDES_CHANGED_EVENT =
  "chain-brief-creator-category-overrides-changed";

const MAX_NAME_LENGTH = 40;

export type CreatorCategoryOverrides = Record<string, string>;

export function readCreatorCategoryOverrides(): CreatorCategoryOverrides {
  if (typeof window === "undefined") return {};
  const stored = window.localStorage.getItem(CREATOR_CATEGORY_OVERRIDES_STORAGE_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: CreatorCategoryOverrides = {};
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

export function writeCreatorCategoryOverrides(overrides: CreatorCategoryOverrides) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CREATOR_CATEGORY_OVERRIDES_STORAGE_KEY,
    JSON.stringify(overrides),
  );
  window.dispatchEvent(
    new CustomEvent(CREATOR_CATEGORY_OVERRIDES_CHANGED_EVENT),
  );
}

export function setCreatorCategoryOverride(sourceId: string, category: string | null) {
  const current = readCreatorCategoryOverrides();
  if (!category || !category.trim()) {
    if (sourceId in current) {
      const { [sourceId]: _removed, ...rest } = current;
      writeCreatorCategoryOverrides(rest);
    }
    return;
  }
  current[sourceId] = category.trim().slice(0, MAX_NAME_LENGTH);
  writeCreatorCategoryOverrides(current);
}
