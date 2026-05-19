export const CUSTOM_CREATOR_CATEGORIES_STORAGE_KEY = "chain-brief-custom-creator-categories";
export const CUSTOM_CREATOR_CATEGORIES_CHANGED_EVENT =
  "chain-brief-custom-creator-categories-changed";

const MAX_NAME_LENGTH = 40;
const MAX_CATEGORIES = 40;

export function readCustomCreatorCategories(): string[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(CUSTOM_CREATOR_CATEGORIES_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map((value) => (typeof value === "string" ? value.trim().slice(0, MAX_NAME_LENGTH) : ""))
          .filter(Boolean),
      ),
    ).slice(0, MAX_CATEGORIES);
  } catch {
    return [];
  }
}

export function writeCustomCreatorCategories(categories: string[]) {
  if (typeof window === "undefined") return;
  const normalized = Array.from(
    new Set(
      categories
        .map((value) => value.trim().slice(0, MAX_NAME_LENGTH))
        .filter(Boolean),
    ),
  ).slice(0, MAX_CATEGORIES);
  window.localStorage.setItem(
    CUSTOM_CREATOR_CATEGORIES_STORAGE_KEY,
    JSON.stringify(normalized),
  );
  window.dispatchEvent(new CustomEvent(CUSTOM_CREATOR_CATEGORIES_CHANGED_EVENT));
}

export function addCustomCreatorCategory(name: string): string[] {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed) return readCustomCreatorCategories();
  const current = readCustomCreatorCategories();
  if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return current;
  const next = [...current, trimmed];
  writeCustomCreatorCategories(next);
  return next;
}

export function removeCustomCreatorCategory(name: string): string[] {
  const target = name.trim().toLowerCase();
  const next = readCustomCreatorCategories().filter(
    (c) => c.trim().toLowerCase() !== target,
  );
  writeCustomCreatorCategories(next);
  return next;
}
