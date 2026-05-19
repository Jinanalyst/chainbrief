import Anthropic from "@anthropic-ai/sdk";
import type { Article } from "@/lib/rss/types";

const MODEL = "claude-haiku-4-5-20251001";

export async function createAiBrief(article: Article) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return createRuleBasedBrief(article);
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 220,
      temperature: 0.2,
      system:
        "You write concise Korean financial news briefs for Chain Brief. Return only 2-3 short lines. No markdown, no investment advice.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            title: article.title,
            source: article.sourceName,
            category: article.category,
            summary: article.rawContentSnippet || article.excerpt,
            tags: article.tags,
          }),
        },
      ],
    });
    const text =
      message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    return text || createRuleBasedBrief(article);
  } catch (error) {
    console.error("[rss/ai] AI brief generation failed", error);
    return createRuleBasedBrief(article);
  }
}

export function createRuleBasedBrief(article: Article) {
  const summary = article.rawContentSnippet || article.excerpt || article.title;
  const firstLine = `${article.sourceName} · ${article.title}`;
  const secondLine = summary.length > 150 ? `${summary.slice(0, 147).trim()}...` : summary;
  const tagLine = article.tags.length ? `관련 태그: ${article.tags.slice(0, 4).join(", ")}` : "";
  return [firstLine, secondLine, tagLine].filter(Boolean).join("\n");
}
