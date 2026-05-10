import {
  CATEGORY_LABELS,
  dictionaries,
  type Language,
} from "@/lib/i18n/dictionaries";

export { CATEGORY_LABELS, dictionaries };
export type { Language };

export const DEFAULT_LANGUAGE: Language = "ko";

export function getDictionary(language: Language) {
  return dictionaries[language] ?? dictionaries[DEFAULT_LANGUAGE];
}

export function getLocale(language: Language) {
  return language === "ko" ? "ko-KR" : "en-US";
}

export function getCategoryLabel(category: string, language: Language) {
  return CATEGORY_LABELS[language][category] ?? category;
}

export function formatRelativeTime(value: string, language: Language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const locale = getLocale(language);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);

  try {
    const formatter = new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
      style: "long",
    });
    const divisions = [
      { amount: 60, unit: "second" },
      { amount: 60, unit: "minute" },
      { amount: 24, unit: "hour" },
      { amount: 7, unit: "day" },
      { amount: 4.345, unit: "week" },
      { amount: 12, unit: "month" },
      { amount: Number.POSITIVE_INFINITY, unit: "year" },
    ] as const;

    let duration = diffSeconds;

    for (const division of divisions) {
      if (Math.abs(duration) < division.amount) {
        return formatter.format(
          Math.round(duration),
          division.unit as Intl.RelativeTimeFormatUnit,
        );
      }

      duration /= division.amount;
    }
  } catch {
    // Fall through to local datetime formatting below.
  }

  if (absoluteSeconds < 60 && language === "ko") {
    return "방금 전";
  }

  return formatLocalDateTime(value, language);
}

export function formatLocalDateTime(value: string, language: Language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatShortDate(value: string, language: Language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatShortTime(value: string, language: Language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
