"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  addOpinionPost,
  type CommunityStance,
} from "@/lib/community";
import { cn } from "@/lib/cn";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";

const STANCES: CommunityStance[] = ["Bullish", "Bearish", "Neutral", "Question"];
const CATEGORIES = [
  "Bitcoin",
  "Ethereum",
  "Solana",
  "Macro",
  "Regulation",
  "Event",
  "News Reactions",
  "Analysis",
  "Questions",
];

export default function CommunityNewPage() {
  const router = useRouter();
  const [preferences] = usePreferences();
  const { language } = useI18n(preferences.language);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Bitcoin");
  const [body, setBody] = useState("");
  const [relatedLink, setRelatedLink] = useState("");
  const [stance, setStance] = useState<CommunityStance>("Neutral");

  function submitPost() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      return;
    }

    addOpinionPost(trimmedBody, category, {
      title: trimmedTitle,
      stance,
      discussionType:
        category === "Analysis"
          ? "analysis"
          : category === "Questions"
            ? "question"
            : category === "Event"
              ? "event"
              : category === "News Reactions"
                ? "news_reaction"
                : "opinion",
      relatedArticleTitle: relatedLink.trim() ? trimmedTitle : undefined,
      relatedArticleUrl: relatedLink.trim() || undefined,
      relatedArticleSource: relatedLink.trim() ? "External link" : undefined,
    });

    router.push("/community");
  }

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto max-w-3xl">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {language === "ko" ? "커뮤니티" : "Community"}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                {language === "ko" ? "새 글 작성" : "Write a post"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                {language === "ko"
                  ? "로그인이 있으면 게시를 제한할 수 있지만, 현재는 로컬 저장 방식으로 동작합니다."
                  : "Login will be required to publish posts later. For now this saves locally in the browser."}
              </p>
            </div>

            <Card className="min-w-0 p-4 sm:p-5">
              <div className="grid gap-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {language === "ko" ? "제목" : "Title"}
                  </span>
                  <input
                    className="mt-2 h-11 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={language === "ko" ? "짧고 명확한 제목" : "Short, clear title"}
                    value={title}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {language === "ko" ? "카테고리" : "Category"}
                  </span>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(event) => setCategory(event.target.value)}
                    value={category}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {language === "ko" ? "본문" : "Body"}
                  </span>
                  <textarea
                    className="mt-2 min-h-40 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={
                      language === "ko"
                        ? "시장 의견, 근거, 관점을 짧게 적어주세요."
                        : "Write your market view, reasoning, or quick take."
                    }
                    value={body}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {language === "ko" ? "관련 링크(선택)" : "Related link (optional)"}
                  </span>
                  <input
                    className="mt-2 h-11 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(event) => setRelatedLink(event.target.value)}
                    placeholder="https://"
                    value={relatedLink}
                  />
                </label>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {language === "ko" ? "입장" : "Stance"}
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STANCES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={stance === item}
                        onClick={() => setStance(item)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                          stance === item
                            ? "border-accent/60 bg-accent/20 text-blue-100"
                            : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/50 hover:text-ink",
                        )}
                      >
                        {language === "ko"
                          ? item === "Bullish"
                            ? "상승"
                            : item === "Bearish"
                              ? "하락"
                              : item === "Neutral"
                                ? "중립"
                                : "질문"
                          : item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={submitPost} type="button">
                    {language === "ko" ? "게시하기" : "Publish"}
                  </Button>
                  <Button href="/community" variant="secondary">
                    {language === "ko" ? "취소" : "Cancel"}
                  </Button>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm leading-6 text-muted">
                    {language === "ko"
                      ? "로그인이 없으면 현재는 브라우저 로컬 저장소에만 저장됩니다."
                      : "Without auth this post is stored only in browser localStorage."}
                  </p>
                </div>
              </div>
            </Card>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="muted">Bitcoin</Badge>
              <Badge tone="muted">News Reactions</Badge>
              <Badge tone="muted">Analysis</Badge>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
