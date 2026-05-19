export const CUSTOM_BRIEF_CATEGORIES_STORAGE_KEY = "chain-brief-custom-brief-categories";
export const CUSTOM_BRIEF_CATEGORIES_CHANGED_EVENT =
  "chain-brief-custom-brief-categories-changed";

const MAX_NAME_LENGTH = 40;
const MAX_CATEGORIES = 40;

export function readCustomBriefCategories(): string[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(CUSTOM_BRIEF_CATEGORIES_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map((value) =>
            typeof value === "string" ? value.trim().slice(0, MAX_NAME_LENGTH) : "",
          )
          .filter(Boolean),
      ),
    ).slice(0, MAX_CATEGORIES);
  } catch {
    return [];
  }
}

export function writeCustomBriefCategories(categories: string[]) {
  if (typeof window === "undefined") return;
  const normalized = Array.from(
    new Set(
      categories.map((value) => value.trim().slice(0, MAX_NAME_LENGTH)).filter(Boolean),
    ),
  ).slice(0, MAX_CATEGORIES);
  window.localStorage.setItem(
    CUSTOM_BRIEF_CATEGORIES_STORAGE_KEY,
    JSON.stringify(normalized),
  );
  window.dispatchEvent(new CustomEvent(CUSTOM_BRIEF_CATEGORIES_CHANGED_EVENT));
}

export function addCustomBriefCategory(name: string): string[] {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed) return readCustomBriefCategories();
  const current = readCustomBriefCategories();
  if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return current;
  const next = [...current, trimmed];
  writeCustomBriefCategories(next);
  return next;
}

export function removeCustomBriefCategory(name: string): string[] {
  const target = name.trim().toLowerCase();
  const next = readCustomBriefCategories().filter(
    (c) => c.trim().toLowerCase() !== target,
  );
  writeCustomBriefCategories(next);
  return next;
}
