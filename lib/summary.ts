import type { BriefPreferences } from "@/lib/preferences";
import type { Article } from "@/lib/rss/types";

export function formatBriefSummary(
  article: Article,
  language: BriefPreferences["language"],
) {
  const sourceText = article.rawContentSnippet || article.excerpt || article.title;

  if (language === "ko") {
    return [
      `핵심: ${article.title}`,
      sourceText ? `맥락: ${sourceText}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return `Brief: ${sourceText}`;
}
