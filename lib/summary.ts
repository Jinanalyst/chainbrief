import type { BriefPreferences } from "@/lib/preferences";
import type { Article } from "@/lib/rss/types";
import { getDictionary } from "@/lib/i18n";

export function formatBriefSummary(
  article: Article,
  language: BriefPreferences["language"],
) {
  const copy = getDictionary(language).summary;
  const sourceText = article.rawContentSnippet || article.excerpt || article.title;
  const tags = article.tags.length > 0 ? article.tags.slice(0, 3).join(", ") : "";

  if (language === "ko") {
    return [
      `${copy.key}: ${article.title}`,
      sourceText ? `${copy.context}: ${sourceText}` : "",
      `${copy.source}: ${article.sourceName}`,
      tags ? `${copy.tags}: ${tags}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return [
    `${copy.key}: ${article.title}`,
    sourceText ? `${copy.context}: ${sourceText}` : "",
    `${copy.source}: ${article.sourceName}`,
    tags ? `${copy.tags}: ${tags}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
