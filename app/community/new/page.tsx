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
  type CommunityPostType,
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

const POST_TYPES: Array<{ value: CommunityPostType; label: string; category: string }> = [
  { value: "general", label: "일반 글", category: "Lounge" },
  { value: "news_interpretation", label: "뉴스 해석", category: "News Reactions" },
  { value: "chart_analysis", label: "차트 분석", category: "Analysis" },
  { value: "trade_review", label: "매매 복기", category: "Analysis" },
  { value: "loss_review", label: "손실 복기", category: "Analysis" },
  { value: "risk_analysis", label: "리스크 분석", category: "Analysis" },
];

const POST_TEMPLATES: Record<CommunityPostType, string> = {
  general: "",
  news_interpretation: `1. 이 뉴스의 핵심은?
2. 시장에는 호재인가 악재인가?
3. 그렇게 보는 이유는?
4. 단기 영향은?
5. 장기 영향은?
6. 반대로 볼 수 있는 시나리오는?
7. 주의해야 할 리스크는?`,
  chart_analysis: `1. 분석 대상:
2. 시간봉:
3. 현재 추세:
4. 주요 지지선:
5. 주요 저항선:
6. 상승 시나리오:
7. 하락 시나리오:
8. 무효화 조건:
9. 개인 의견:`,
  trade_review: `1. 진입 이유:
2. 청산 이유:
3. 잘한 점:
4. 실수한 점:
5. 다음에 고칠 점:
6. 배운 점:`,
  loss_review: `1. 손실이 발생한 상황:
2. 판단 근거:
3. 놓친 리스크:
4. 감정적으로 흔들린 부분:
5. 다시 한다면 어떻게 할 것인가:
6. 배운 점:`,
  risk_analysis: `1. 분석 대상:
2. 핵심 리스크:
3. 리스크가 현실화될 조건:
4. 시장에 미칠 영향:
5. 확인해야 할 지표:
6. 반대 시나리오:
7. 개인 의견:`,
};

const INVESTMENT_NOTICE =
  "본 콘텐츠는 투자 권유가 아닌 정보 제공 목적입니다. 가상자산 투자는 원금 손실 위험이 있으며, 최종 판단과 책임은 투자자 본인에게 있습니다.";

export default function CommunityNewPage() {
  const router = useRouter();
  const [preferences] = usePreferences();
  const { language } = useI18n(preferences.language);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Bitcoin");
  const [postType, setPostType] = useState<CommunityPostType>("general");
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
      postType,
      analystTier:
        postType === "general"
          ? undefined
          : postType === "risk_analysis"
            ? "rising_analyst"
            : "rookie_analyst",
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
                    글 유형
                  </span>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                    onChange={(event) => {
                      const nextType = event.target.value as CommunityPostType;
                      const template = POST_TEMPLATES[nextType];

                      setPostType(nextType);
                      setCategory(
                        POST_TYPES.find((item) => item.value === nextType)?.category ?? category,
                      );

                      if (!body.trim() || body === POST_TEMPLATES[postType]) {
                        setBody(template);
                      }
                    }}
                    value={postType}
                  >
                    {POST_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
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

                {postType !== "general" ? (
                  <div className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2">
                    <p className="text-xs leading-5 text-amber-100">{INVESTMENT_NOTICE}</p>
                  </div>
                ) : null}

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
