"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/brand-logo";
import { usePreferences } from "@/lib/i18n/use-i18n";

const landingCopy = {
  ko: {
    heroTitle: "뉴스를 넘어, 시장을 해석하고 신뢰를 쌓는 크립토 정보 네트워크.",
    heroText:
      "Chain Brief는 실시간 크립토 뉴스, Bull/Bear 토론, 커뮤니티 분석, 애널리스트 성장 시스템이 하나의 정보 체인으로 연결된 인사이트 플랫폼입니다.",
    primaryCta: "내 의견 남기기",
    secondaryCta: "애널리스트로 성장하기",
    preview: [
      {
        label: "News",
        title: "ETF 플로우, 거래소 보유량, 매크로 일정을 짧게 요약",
        meta: "빠른 브리프",
      },
      {
        label: "Bull / Bear",
        title: "이 내러티브에 대해 62% 상승, 24% 중립, 14% 하락 의견",
        meta: "시장 분위기",
      },
      {
        label: "Analyst",
        title: "Rookie Analyst 글이 근거와 리스크 노트로 강화됨",
        meta: "신뢰 성장",
      },
    ],
    bridgeEyebrow: "What Chain Brief connects",
    bridgeTitle: "뉴스, 의견, 분석, 신뢰가 하나의 체인으로 이어집니다.",
    bridgeText:
      "Chain의 의미는 블록체인에만 머물지 않습니다. Chain Brief에서 Chain은 흩어진 정보와 사람, 해석과 신뢰가 연결되는 정보 체인을 뜻합니다.",
    pillars: [
      {
        title: "빠른 뉴스 요약",
        text: "복잡한 크립토 뉴스를 짧고 명확하게 정리해 핵심 흐름을 빠르게 파악합니다.",
      },
      {
        title: "Bull / Bear 의견",
        text: "뉴스마다 상승, 하락, 중립 관점을 모아 시장 분위기를 한눈에 볼 수 있습니다.",
      },
      {
        title: "분석이 쌓이는 커뮤니티",
        text: "생각, 차트 분석, 트레이딩 리뷰, 리스크 관점이 단순 댓글이 아닌 인사이트로 연결됩니다.",
      },
    ],
    chainEyebrow: "Information Chain",
    chainTitle: "단순 뉴스 피드가 아니라, 정보가 연결되는 구조.",
    chainText:
      "하나의 뉴스는 요약에서 끝나지 않습니다. 사람들의 시장 의견, 커뮤니티 분석, 애널리스트 리포트로 이어지며 더 깊은 판단을 돕습니다.",
    communityCta: "커뮤니티 보기",
    analystsCta: "애널리스트 보기",
    chainItems: [
      {
        title: "뉴스와 토론을 연결",
        text: "하나의 뉴스가 Bull/Bear 의견, 커뮤니티 글, 관련 브리프로 이어집니다.",
      },
      {
        title: "분석과 근거를 연결",
        text: "주장에는 출처, 차트, 리스크 관점, 반대 시나리오가 함께 붙습니다.",
      },
      {
        title: "사람과 신뢰를 연결",
        text: "좋은 글과 꾸준한 참여가 Rookie, Rising, Verified Analyst 단계로 이어집니다.",
      },
      {
        title: "정보와 행동을 연결",
        text: "빠른 요약에서 시작해 의견을 비교하고, 더 깊은 리포트와 뉴스레터로 이동합니다.",
      },
    ],
    growthEyebrow: "Analyst growth",
    growthTitle: "일반 유저도 신뢰받는 애널리스트로 성장할 수 있습니다.",
    growthText:
      "처음에는 의견을 남기는 유저로 시작해도, 좋은 분석과 꾸준한 활동이 쌓이면 Rookie Analyst, Rising Analyst, Verified Analyst로 성장할 수 있습니다.",
    ladder: [
      {
        level: "01",
        title: "General User",
        text: "뉴스를 읽고 Bull/Bear 의견을 남기며 시장을 보는 감각을 기릅니다.",
      },
      {
        level: "02",
        title: "Rookie Analyst",
        text: "뉴스 해석, 차트 분석, 트레이딩 리뷰를 구조화된 글로 남깁니다.",
      },
      {
        level: "03",
        title: "Rising Analyst",
        text: "꾸준한 분석과 커뮤니티 반응을 통해 신뢰와 평판을 쌓습니다.",
      },
      {
        level: "04",
        title: "Verified Analyst",
        text: "검증된 분석가로 인정받고 리포트와 뉴스레터형 콘텐츠를 제공합니다.",
      },
    ],
    trustEyebrow: "Trust system",
    trustTitle: "신뢰는 팔로워 수가 아니라 분석 과정에서 만들어집니다.",
    trustText:
      "Chain Brief는 근거, 리스크 인식, 분석의 명확성, 커뮤니티 반응을 통해 누가 더 신뢰할 만한 해석을 쌓아가고 있는지 보여줍니다.",
    scoreLabel: "Analyst trust",
    scoreBadge: "Rising",
    scores: [
      ["근거 충실도", 86],
      ["리스크 인식", 78],
      ["분석 명확성", 91],
      ["커뮤니티 신뢰", 73],
    ],
    readerEyebrow: "Verified Analyst",
    readerTitle: "신뢰를 쌓은 사람들의 인사이트를 팔로우합니다.",
    readerText:
      "Chain Brief는 전문가만 말하는 공간이 아닙니다. 좋은 분석을 꾸준히 쌓은 사람들이 인정받고, 독자는 그들의 리포트와 뉴스레터형 콘텐츠를 따라갈 수 있습니다.",
    readerBenefits: [
      "검증된 애널리스트의 리포트와 브리프를 팔로우",
      "뉴스마다 시장의 상승, 하락 관점을 함께 확인",
      "커뮤니티 분석과 트레이딩 리뷰를 한 흐름으로 탐색",
      "누가 어떤 근거로 말하는지 투명하게 비교",
    ],
    finalEyebrow: "Start the chain",
    finalTitle: "뉴스를 읽고, 의견을 나누고, 분석가로 성장하세요.",
    writeCta: "분석 글 쓰기",
    applyCta: "애널리스트 신청",
    footer:
      "Chain Brief는 크립토 뉴스, 시장 의견, 커뮤니티 분석, 애널리스트 신뢰를 하나의 정보 체인으로 연결합니다.",
  },
  en: {
    heroTitle: "Beyond reading news: interpret the market and build trust.",
    heroText:
      "Chain Brief is a crypto insight network where real-time news, Bull/Bear debate, community analysis, and analyst growth are connected into one information chain.",
    primaryCta: "Share Your Take",
    secondaryCta: "Grow as an Analyst",
    preview: [
      {
        label: "News",
        title: "ETF flows, exchange reserves, and macro events summarized",
        meta: "Fast brief",
      },
      {
        label: "Bull / Bear",
        title: "62% bullish, 24% neutral, 14% bearish on this narrative",
        meta: "Market mood",
      },
      {
        label: "Analyst",
        title: "Rookie Analyst post upgraded with evidence and risk notes",
        meta: "Trust grows",
      },
    ],
    bridgeEyebrow: "What Chain Brief connects",
    bridgeTitle: "News, opinions, analysis, and trust form one chain.",
    bridgeText:
      "Chain does not only mean blockchain. In Chain Brief, it also means an information chain where people, market signals, interpretation, and trust are connected.",
    pillars: [
      {
        title: "Fast News Briefs",
        text: "Complex crypto stories become short, clear briefs so readers can grasp the core signal quickly.",
      },
      {
        title: "Bull / Bear Views",
        text: "Each news item can gather bullish, bearish, and neutral opinions so market mood is easier to scan.",
      },
      {
        title: "Community Analysis",
        text: "Ideas, chart analysis, trade reviews, and risk views become accumulated insight, not disposable comments.",
      },
    ],
    chainEyebrow: "Information Chain",
    chainTitle: "Not just a news feed. A connected information structure.",
    chainText:
      "A news item should not end at the headline. It can lead into market opinions, community analysis, analyst reports, and better judgment.",
    communityCta: "View Community",
    analystsCta: "Explore Analysts",
    chainItems: [
      {
        title: "Connect News and Debate",
        text: "One story can lead to Bull/Bear opinions, community posts, and related briefs.",
      },
      {
        title: "Connect Analysis and Evidence",
        text: "Claims can be supported by sources, charts, risk views, and opposing scenarios.",
      },
      {
        title: "Connect People and Trust",
        text: "Strong writing and consistent participation can lead from Rookie to Rising to Verified Analyst.",
      },
      {
        title: "Connect Information and Action",
        text: "Readers can move from a quick summary to opinions, deeper reports, and newsletter-style analysis.",
      },
    ],
    growthEyebrow: "Analyst growth",
    growthTitle: "Any user can grow into a trusted analyst.",
    growthText:
      "A user can begin by sharing opinions, then build credibility through consistent analysis and progress toward Rookie Analyst, Rising Analyst, and Verified Analyst status.",
    ladder: [
      {
        level: "01",
        title: "General User",
        text: "Read news, leave Bull/Bear opinions, and develop a feel for the market.",
      },
      {
        level: "02",
        title: "Rookie Analyst",
        text: "Turn news interpretation, chart analysis, and trade reviews into structured posts.",
      },
      {
        level: "03",
        title: "Rising Analyst",
        text: "Build reputation through consistent analysis and meaningful community response.",
      },
      {
        level: "04",
        title: "Verified Analyst",
        text: "Earn recognition and publish reports, briefs, and newsletter-style content.",
      },
    ],
    trustEyebrow: "Trust system",
    trustTitle: "Trust is built through the analysis process, not follower count.",
    trustText:
      "Chain Brief can show who is building credible interpretation through evidence, risk awareness, clarity, and community trust.",
    scoreLabel: "Analyst trust",
    scoreBadge: "Rising",
    scores: [
      ["Evidence quality", 86],
      ["Risk awareness", 78],
      ["Analysis clarity", 91],
      ["Community trust", 73],
    ],
    readerEyebrow: "Verified Analyst",
    readerTitle: "Follow insights from people who have earned trust.",
    readerText:
      "Chain Brief is not a place where only established experts speak. It is a system where people who build strong analysis over time can be recognized and followed.",
    readerBenefits: [
      "Follow verified analysts, reports, and briefs",
      "Compare bullish and bearish views beside each news item",
      "Explore community analysis and trade reviews in one flow",
      "See who is making claims and what evidence supports them",
    ],
    finalEyebrow: "Start the chain",
    finalTitle: "Read the news, share your view, and grow as an analyst.",
    writeCta: "Write Analysis",
    applyCta: "Apply as Analyst",
    footer:
      "Chain Brief connects crypto news, market opinions, community analysis, and analyst trust into one information chain.",
  },
} as const;

type LandingCopy = (typeof landingCopy)[keyof typeof landingCopy];

export function HomepageLanding() {
  const [preferences] = usePreferences();
  const copy = landingCopy[preferences.language] ?? landingCopy.ko;

  return (
    <>
      <HeroSection copy={copy} />
      <BridgeSection copy={copy} />
      <StudioSection copy={copy} />
      <LadderSection copy={copy} />
      <TrustSection copy={copy} />
      <ReaderSection copy={copy} />
      <FinalCtaSection copy={copy} />
      <LandingFooter copy={copy} />
    </>
  );
}

function HeroSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-background/72">
      <div className="landing-signal-bg absolute inset-0" />
      <Container className="relative min-w-0 pb-12 pt-12 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-20">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.75fr)] lg:items-end">
          <div className="min-w-0 max-w-4xl">
            <Badge tone="accent">Chain Brief</Badge>
            <h1 className="mt-5 max-w-5xl break-words text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {copy.heroText}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto" href="/community/write">
                {copy.primaryCta}
              </Button>
              <Button className="w-full sm:w-auto" href="/analyst/apply" variant="secondary">
                {copy.secondaryCta}
              </Button>
            </div>
          </div>

          <div className="min-w-0">
            <div className="landing-radar relative min-h-[23rem] overflow-hidden rounded-lg border border-accent/20 bg-accent-soft/10">
              <div className="absolute inset-x-3 top-5 space-y-3 sm:inset-x-6">
                {copy.preview.map((item, index) => (
                  <div
                    className="landing-float min-w-0 rounded-lg border border-white/10 bg-surface/88 p-4 shadow-soft backdrop-blur"
                    key={item.title}
                    style={{ animationDelay: `${index * 0.6}s` }}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="rounded bg-accent/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-blue-200">
                        {item.label}
                      </span>
                      <span className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
                        {item.meta}
                      </span>
                    </div>
                    <p className="mt-3 break-words text-sm font-semibold leading-6 text-ink">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function BridgeSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-white/10 bg-background/80">
      <Container className="section-space">
        <SectionIntro
          eyebrow={copy.bridgeEyebrow}
          title={copy.bridgeTitle}
          text={copy.bridgeText}
        />
        <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
          {copy.pillars.map((point) => (
            <Card className="min-w-0 p-4 sm:p-5" key={point.title}>
              <span className="block h-1.5 w-8 rounded-full bg-accent" />
              <h3 className="mt-4 break-words text-lg font-semibold text-ink">
                {point.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">{point.text}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function StudioSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-white/10 bg-surface/35">
      <Container className="section-space grid min-w-0 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {copy.chainEyebrow}
          </p>
          <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
            {copy.chainTitle}
          </h2>
          <p className="mt-4 text-base leading-8 text-muted">{copy.chainText}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" href="/community">
              {copy.communityCta}
            </Button>
            <Button className="w-full sm:w-auto" href="/analysts" variant="secondary">
              {copy.analystsCta}
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {copy.chainItems.map((feature) => (
            <Card className="min-w-0 p-4 sm:p-5" key={feature.title}>
              <h3 className="break-words text-base font-semibold text-ink sm:text-lg">
                {feature.title}
              </h3>
              <p className="mt-2 break-words text-sm leading-6 text-muted">
                {feature.text}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function LadderSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-white/10 bg-background/80">
      <Container className="section-space">
        <SectionIntro
          eyebrow={copy.growthEyebrow}
          title={copy.growthTitle}
          text={copy.growthText}
        />
        <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2 lg:grid-cols-4">
          {copy.ladder.map((step) => (
            <Card className="relative min-w-0 p-4 sm:p-5" key={step.title}>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                {step.level}
              </span>
              <h3 className="mt-4 break-words text-lg font-semibold text-ink sm:text-xl">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">{step.text}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function TrustSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-white/10 bg-surface/35">
      <Container className="section-space grid min-w-0 gap-8 lg:grid-cols-[1fr_24rem] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {copy.trustEyebrow}
          </p>
          <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
            {copy.trustTitle}
          </h2>
          <p className="mt-4 text-base leading-8 text-muted">{copy.trustText}</p>
        </div>

        <Card className="min-w-0 p-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {copy.scoreLabel}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">82</h3>
            </div>
            <Badge tone="accent">{copy.scoreBadge}</Badge>
          </div>
          <div className="mt-5 grid gap-4">
            {copy.scores.map(([label, value]) => (
              <div key={label}>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="font-semibold text-blue-100">{value}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Container>
    </section>
  );
}

function ReaderSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-white/10 bg-background/80">
      <Container className="section-space">
        <SectionIntro
          eyebrow={copy.readerEyebrow}
          title={copy.readerTitle}
          text={copy.readerText}
        />
        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-4">
          {copy.readerBenefits.map((item) => (
            <Card className="min-w-0 p-4" key={item}>
              <span className="block h-1.5 w-8 rounded-full bg-success" />
              <p className="mt-4 break-words text-sm font-semibold leading-6 text-ink">
                {item}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FinalCtaSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-white/10 bg-surface/35">
      <Container className="section-space">
        <div className="overflow-hidden rounded-lg border border-accent/25 bg-accent-soft/25 p-5 shadow-glow sm:p-8 lg:p-10">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                {copy.finalEyebrow}
              </p>
              <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
                {copy.finalTitle}
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Button className="w-full sm:w-auto" href="/community/write">
                {copy.writeCta}
              </Button>
              <Button className="w-full sm:w-auto" href="/analyst/apply" variant="secondary">
                {copy.applyCta}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function LandingFooter({ copy }: { copy: LandingCopy }) {
  return (
    <footer className="border-t border-white/10 bg-background/90">
      <Container className="flex min-w-0 flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <BrandLogo compact className="max-w-full" />
        <p className="max-w-xl text-sm leading-6 text-muted">{copy.footer}</p>
      </Container>
    </footer>
  );
}

function SectionIntro({
  eyebrow,
  text,
  title,
}: {
  eyebrow: string;
  text: string;
  title: string;
}) {
  return (
    <div className="min-w-0 max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-base leading-7 text-muted">{text}</p>
    </div>
  );
}
