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
      max_tokens: 180,
      temperature: 0.2,
      system:
        "You write concise Korean financial news briefs for Chain Brief. Return exactly two sentences that summarize the overall information of the article, like the opening lines of a news report. Ignore and strip any journalist byline, reporter name, dateline (e.g. 'By Jane Doe', '홍길동 기자', '[서울=뉴스1]', 'SEOUL (Reuters) -') from the input — the two sentences must contain only the actual story content. No markdown, no bullet points, no tags, no source/title prefix, no investment advice.",
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

function stripByline(text: string) {
  let out = text;
  // Repeatedly strip leading byline / dateline patterns that appear before the actual lede.
  for (let i = 0; i < 4; i += 1) {
    const before = out;
    out = out
      // "By Jane Doe", "By Jane Doe, Reuters" — up to the next sentence boundary or dash/pipe
      .replace(/^\s*(?:by|글|기자)\s*[:\-]?\s*[^.!?。！？|\-–—]{1,80}?(?=[.!?。！？|\-–—]|$)[.!?。！？|\-–—]?\s*/i, "")
      // "Jane Doe, Reporter ·" / "Jane Doe | "
      .replace(/^\s*[A-Z][\p{L}.'\- ]{1,40}\s*(?:,|·|\||–|—|-)\s*(?:reporter|correspondent|staff|editor|writer)\b[^.!?。！？]*[.!?。！？]?\s*/iu, "")
      // Korean byline: "홍길동 기자" / "홍길동 기자 ="
      .replace(/^\s*[\p{L}]{2,5}\s*기자\s*(?:=|·|\||-|–|—)?\s*/u, "")
      // Dateline: "SEOUL, May 29 (Reuters) -" / "[서울=뉴스1]" / "(세종=연합뉴스)"
      .replace(/^\s*\[[^\]]{1,60}\]\s*/, "")
      .replace(/^\s*\([^)]{1,60}=[^)]{1,60}\)\s*/, "")
      .replace(/^\s*[A-Z][A-Z\s,]{1,40},\s*[A-Z][a-z]+\s*\d{1,2}\s*\([^)]+\)\s*[-–—:]\s*/, "")
      .replace(/^\s*\(?[A-Z][A-Z]+\)?\s*[-–—:]\s*/, "")
      // Korean reporter line that may follow the dateline: "오진송 기자 =" / "홍길동 기자 ·"
      .replace(/^\s*[\p{Script=Hangul}]{2,5}\s*기자\s*[=·:|\-–—]?\s*/u, "");
    if (out === before) break;
  }
  // Global passes: strip reporter mentions and contact lines anywhere in the brief.
  out = out
    // "홍길동 기자 = " anywhere (the "=" is a hard byline marker)
    .replace(/[\p{Script=Hangul}]{2,5}\s*기자\s*=\s*/gu, "")
    // Email contact like "reporter@news.com" or "기자 email@x.com"
    .replace(/\s*[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\s*/g, " ")
    // Trailing reporter sign-off: "... 김철수 기자.", "... 김철수 기자 / 연합뉴스"
    .replace(/[\p{Script=Hangul}]{2,5}\s*기자(?:\s*[\/|·]\s*[^.!?。！？]{1,30})?\s*[.。]?\s*$/u, "")
    // Collapse any double-spaces we introduced
    .replace(/\s{2,}/g, " ");
  return out.trim();
}

export function createRuleBasedBrief(article: Article) {
  const raw = (article.rawContentSnippet || article.excerpt || article.title).replace(/\s+/g, " ").trim();
  const summary = stripByline(raw) || raw;
  const sentences = summary.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [summary];
  const twoSentences = sentences.slice(0, 2).join(" ").trim();
  return twoSentences.length > 280 ? `${twoSentences.slice(0, 277).trim()}...` : twoSentences;
}
