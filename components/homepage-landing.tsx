"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";
import { usePreferences } from "@/lib/i18n/use-i18n";

const landingCopy = {
  ko: {
    heroBadge: "금융 인텔리전스 네트워크",
    heroTitle: "Chain Brief는 시장 뉴스, 분석, 그리고 사람을 하나의 금융 정보 네트워크로 연결합니다.",
    heroText:
      "실시간 마켓 브리프, 애널리스트 리서치, 커뮤니티 시그널, 시장 히트맵 — 분산된 정보를 하나의 인텔리전스 플랫폼으로 통합합니다.",
    primaryCta: "네트워크 탐색",
    secondaryCta: "애널리스트 신청",
    stats: [
      { value: "2,400+", label: "브리프" },
      { value: "89", label: "활성 애널리스트" },
      { value: "340K+", label: "마켓 이벤트" },
    ],
    preview: [
      {
        label: "LIVE BRIEF",
        badge: "+2.3%",
        badgeTone: "success" as const,
        title: "BTC ETF 순유입 6주 최고치 $6.8억 기록 — 기관 수요 재확인",
        meta: "CoinDesk · 4분 전",
      },
      {
        label: "ANALYST SIGNAL",
        badge: "근거 91",
        badgeTone: "accent" as const,
        title: "Rising Analyst, DXY 강세와 BTC 회복력의 매크로 괴리 포착",
        meta: "Rising Analyst · 증거 점수",
      },
      {
        label: "COMMUNITY",
        badge: "강세 78%",
        badgeTone: "success" as const,
        title: "SOL 네트워크 업그레이드 확정 후 애널리스트 78% 강세 전환",
        meta: "89개 반응 · 인기 토론",
      },
    ],
    bridgeEyebrow: "세 가지 신호, 하나의 네트워크",
    bridgeTitle: "시장 뉴스, 애널리스트 인텔리전스, 커뮤니티 시그널.",
    bridgeText:
      "Chain Brief는 실시간 마켓 데이터, 구조화된 리서치, 성장하는 애널리스트 커뮤니티의 집단 인텔리전스가 교차하는 플랫폼입니다.",
    pillars: [
      {
        icon: "▸",
        title: "실시간 마켓 브리프",
        text: "크립토 헤드라인을 소스·카테고리·이벤트 메타데이터와 함께 명확하고 스캔 가능한 브리프로 정리. 지속 업데이트.",
      },
      {
        icon: "▸",
        title: "애널리스트 리서치",
        text: "근거 품질, 리스크 인식, 일관성으로 평가된 커뮤니티 애널리스트 네트워크의 구조화된 분석.",
      },
      {
        icon: "▸",
        title: "커뮤니티 시그널",
        text: "Bull/Bear 컨센서스, 시장 반응, 토론 스레드가 원시 뉴스를 집단 인텔리전스로 전환합니다.",
      },
    ],
    chainEyebrow: "연결된 정보 흐름",
    chainTitle: "모든 시그널은 연결됩니다. 모든 분석은 다시 연결됩니다.",
    chainText:
      "브리프는 체인의 시작이지 끝이 아닙니다. Chain Brief는 각 뉴스를 토론, 리서치, 애널리스트 코멘터리, 시장 컨센서스로 연결합니다.",
    communityCta: "커뮤니티 보기",
    analystsCta: "애널리스트 탐색",
    chainItems: [
      {
        step: "01",
        title: "뉴스 → 토론",
        text: "각 브리프는 즉시 Bull/Bear 의견, 커뮤니티 토론, 관련 시장 시그널로 이어집니다.",
      },
      {
        step: "02",
        title: "분석 → 근거",
        text: "애널리스트 포스트는 출처, 차트, 리스크 관점, 반대 시나리오를 함께 담아야 합니다.",
      },
      {
        step: "03",
        title: "사람 → 평판",
        text: "일관된 증거 기반 분석은 검증 가능한 트랙 레코드를 쌓습니다. 신뢰는 Chain Brief에서 복리로 증가합니다.",
      },
      {
        step: "04",
        title: "시그널 → 행동",
        text: "빠른 요약에서 심층 리포트까지 — 독자는 모든 마켓 스토리의 전체 깊이를 탐색할 수 있습니다.",
      },
    ],
    growthEyebrow: "애널리스트 네트워크",
    growthTitle: "애널리스트 프로필을 구축하고 네트워크에서 자리를 획득하세요.",
    growthText:
      "Chain Brief는 실력 기반 애널리스트 네트워크입니다. 시장 의견 공유로 시작해 분석이 커뮤니티 신뢰를 얻으면서 단계적으로 성장합니다.",
    ladder: [
      {
        level: "01",
        title: "커뮤니티 멤버",
        text: "브리프를 팔로우하고 Bull/Bear 의견을 공유하며 시장 해석 감각을 기릅니다.",
      },
      {
        level: "02",
        title: "Rookie Analyst",
        text: "근거, 차트, 리스크 프레임워크를 갖춘 구조화된 분석 글을 발행합니다.",
      },
      {
        level: "03",
        title: "Rising Analyst",
        text: "일관된 고품질 리서치와 시그널 정확도를 통해 커뮤니티 인정을 획득합니다.",
      },
      {
        level: "04",
        title: "Verified Analyst",
        text: "네트워크의 신뢰받는 목소리로 성장해 리포트, 뉴스레터, 프리미엄 리서치를 발행합니다.",
      },
    ],
    trustEyebrow: "시그널 품질",
    trustTitle: "신뢰는 팔로워 수가 아니라 근거 품질로 만들어집니다.",
    trustText:
      "Chain Brief는 각 애널리스트를 근거 품질, 리스크 인식, 분석 명확성, 커뮤니티 신뢰로 평가합니다 — 독자가 누구의 시그널이 중요한지 판단할 수 있도록.",
    scoreLabel: "시그널 점수",
    scoreBadge: "Rising",
    scores: [
      ["근거 충실도", 86],
      ["리스크 인식", 78],
      ["분석 명확성", 91],
      ["커뮤니티 신뢰", 73],
    ],
    readerEyebrow: "인텔리전스 피드",
    readerTitle: "시장에서 시그널을 쌓은 애널리스트를 팔로우하세요.",
    readerText:
      "Chain Brief는 가장 중요한 목소리를 부각시킵니다 — 크고 빠른 의견이 아니라 일관된 증거 기반 작업으로 신뢰를 구축한 애널리스트.",
    readerBenefits: [
      "검증된 애널리스트의 리포트와 라이브 브리프를 하나의 피드에서",
      "모든 뉴스 항목의 Bull/Bear 시그널 비교",
      "완전한 증거 트레일이 있는 구조화된 분석 탐색",
      "근거·명확성·리스크에 걸친 애널리스트 신뢰 점수 추적",
    ],
    finalEyebrow: "네트워크에 참여하세요",
    finalTitle: "시장을 읽고, 분석을 공유하고, 평판을 쌓으세요.",
    writeCta: "분석 글 쓰기",
    applyCta: "애널리스트 신청",
    footer:
      "Chain Brief는 시장 뉴스, 분석, 그리고 사람을 하나의 금융 인텔리전스 네트워크로 연결합니다.",
  },
  en: {
    heroBadge: "Financial Intelligence Network",
    heroTitle:
      "Chain Brief connects market news, analysis, and people into one financial information network.",
    heroText:
      "Live market briefs, analyst research, community signals, and market heatmaps — fragmented information unified into a single intelligence platform.",
    primaryCta: "Explore the Network",
    secondaryCta: "Apply as Analyst",
    stats: [
      { value: "2,400+", label: "briefs indexed" },
      { value: "89", label: "active analysts" },
      { value: "340K+", label: "market events" },
    ],
    preview: [
      {
        label: "LIVE BRIEF",
        badge: "+2.3%",
        badgeTone: "success" as const,
        title: "BTC ETF inflows hit $680M — highest single-day flow in six weeks",
        meta: "CoinDesk · 4 min ago",
      },
      {
        label: "ANALYST SIGNAL",
        badge: "Evidence 91",
        badgeTone: "accent" as const,
        title: "Rising Analyst flags macro divergence between DXY strength and BTC resilience",
        meta: "Rising Analyst · Evidence-scored",
      },
      {
        label: "COMMUNITY",
        badge: "78% Bullish",
        badgeTone: "success" as const,
        title: "78% of analysts turn bullish on SOL following network upgrade confirmation",
        meta: "89 reactions · Trending",
      },
    ],
    bridgeEyebrow: "Three signals. One network.",
    bridgeTitle: "Market news, analyst intelligence, and community signal.",
    bridgeText:
      "Chain Brief operates at the intersection of live market data, structured research, and the collective intelligence of a growing analyst community.",
    pillars: [
      {
        icon: "▸",
        title: "Live Market Briefs",
        text: "Crypto headlines distilled into clear, scannable briefs with source, category, and event metadata — updated continuously.",
      },
      {
        icon: "▸",
        title: "Analyst Research",
        text: "Structured analysis from a growing network of community analysts, ranked by evidence quality, risk awareness, and consistency.",
      },
      {
        icon: "▸",
        title: "Community Signal",
        text: "Bull/Bear consensus, market reactions, and discussion threads that transform raw news into collective intelligence.",
      },
    ],
    chainEyebrow: "Connected information flow",
    chainTitle: "Every signal connects. Every analysis links back.",
    chainText:
      "A brief is the start of a chain — not the end. Chain Brief links each story into debate, research, analyst commentary, and market consensus.",
    communityCta: "View Community",
    analystsCta: "Explore Analysts",
    chainItems: [
      {
        step: "01",
        title: "News → Debate",
        text: "Each brief surfaces Bull/Bear opinions, community discussion, and related market signals instantly.",
      },
      {
        step: "02",
        title: "Analysis → Evidence",
        text: "Analyst posts must carry sources, charts, risk views, and opposing scenarios — not just opinions.",
      },
      {
        step: "03",
        title: "People → Reputation",
        text: "Consistent, evidenced analysis builds a verifiable track record. Credibility compounds on Chain Brief.",
      },
      {
        step: "04",
        title: "Signal → Action",
        text: "From quick summary to deep report, readers can navigate the full depth of any market story.",
      },
    ],
    growthEyebrow: "Analyst network",
    growthTitle: "Build your analyst profile. Earn your place in the network.",
    growthText:
      "Chain Brief is a merit-based analyst network. Start by sharing market takes. Rise through the ranks as your analysis earns community trust.",
    ladder: [
      {
        level: "01",
        title: "Community Member",
        text: "Follow briefs, share Bull/Bear takes, and build your market reading instincts.",
      },
      {
        level: "02",
        title: "Rookie Analyst",
        text: "Publish structured analysis with evidence, charts, and risk frameworks.",
      },
      {
        level: "03",
        title: "Rising Analyst",
        text: "Earn community recognition through consistent, high-quality research and signal accuracy.",
      },
      {
        level: "04",
        title: "Verified Analyst",
        text: "Become a trusted voice in the network. Publish reports, newsletters, and premium research.",
      },
    ],
    trustEyebrow: "Signal quality",
    trustTitle: "Credibility is built through evidence quality, not follower count.",
    trustText:
      "Chain Brief scores each analyst across evidence quality, risk awareness, clarity, and community trust — so readers can calibrate whose signal matters.",
    scoreLabel: "Signal score",
    scoreBadge: "Rising",
    scores: [
      ["Evidence quality", 86],
      ["Risk awareness", 78],
      ["Analysis clarity", 91],
      ["Community trust", 73],
    ],
    readerEyebrow: "Intelligence feed",
    readerTitle: "Follow analysts who have earned signal in the market.",
    readerText:
      "Chain Brief surfaces the voices that matter most: analysts who build credibility through consistent, evidenced work — not just loud opinions.",
    readerBenefits: [
      "Follow verified analysts, reports, and live briefs in one feed",
      "Compare Bull/Bear signal on every news item",
      "Explore structured analysis with full evidence trails",
      "Track analyst credibility scores across evidence, clarity, and risk",
    ],
    finalEyebrow: "Join the network",
    finalTitle: "Read the market. Share your analysis. Build your reputation.",
    writeCta: "Write Analysis",
    applyCta: "Apply as Analyst",
    footer:
      "Chain Brief connects market news, analysis, and people into one financial intelligence network.",
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
    <section className="relative overflow-hidden border-t border-tint/10 bg-background/72">
      <div className="landing-signal-bg absolute inset-0" />
      <Container className="relative min-w-0 pb-12 pt-12 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-20">
        <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.75fr)] lg:items-end">
          {/* Left: copy */}
          <div className="min-w-0 max-w-4xl">
            <Badge tone="accent">{copy.heroBadge}</Badge>
            <h1 className="mt-5 max-w-4xl text-balance break-words text-4xl font-semibold leading-[1.16] tracking-tight text-ink [word-break:keep-all] sm:text-5xl sm:leading-[1.14] lg:text-6xl lg:leading-[1.1]">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {copy.heroText}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto" href="/briefs">
                {copy.primaryCta}
              </Button>
              <Button className="w-full sm:w-auto" href="/analyst/apply" variant="secondary">
                {copy.secondaryCta}
              </Button>
            </div>

            {/* Live stats bar */}
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-tint/[0.07] pt-6">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Live
              </span>
              {copy.stats.map((s) => (
                <span key={s.label} className="text-xs text-muted-2">
                  <span className="font-semibold text-ink">{s.value}</span>{" "}
                  {s.label}
                </span>
              ))}
              <span className="text-xs text-muted-2">
                Market data · Binance-powered
              </span>
            </div>
          </div>

          {/* Right: terminal-style preview cards */}
          <div className="min-w-0">
            <div className="landing-radar relative min-h-[26rem] overflow-hidden rounded-lg border border-accent/20 bg-accent-soft/10">
              {/* Terminal header bar */}
              <div className="flex items-center gap-1.5 border-b border-tint/[0.07] px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-danger/60" />
                <span className="h-2 w-2 rounded-full bg-accent/40" />
                <span className="h-2 w-2 rounded-full bg-success/40" />
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-muted-2">
                  Chain Brief · Live Feed
                </span>
              </div>

              <div className="absolute inset-x-3 top-12 space-y-2.5 sm:inset-x-4">
                {copy.preview.map((item, index) => (
                  <div
                    className="landing-float min-w-0 rounded-lg border border-tint/10 bg-surface/90 p-3.5 shadow-soft backdrop-blur"
                    key={item.title}
                    style={{ animationDelay: `${index * 0.6}s` }}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-accent-ink">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-bold",
                          item.badgeTone === "success"
                            ? "bg-success/15 text-success"
                            : "bg-accent/15 text-accent",
                        )}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-[0.8rem] font-semibold leading-5 text-ink">
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-[0.68rem] text-muted-2">{item.meta}</p>
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
    <section className="border-t border-tint/10 bg-background/80">
      <Container className="section-space">
        <SectionIntro
          eyebrow={copy.bridgeEyebrow}
          title={copy.bridgeTitle}
          text={copy.bridgeText}
        />
        <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
          {copy.pillars.map((point) => (
            <Card className="group min-w-0 p-5 sm:p-6" key={point.title}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/30 bg-accent/10 text-xs font-bold text-accent">
                {point.icon}
              </span>
              <h3 className="mt-4 break-words text-base font-semibold text-ink sm:text-lg">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{point.text}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function StudioSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-tint/10 bg-surface/35">
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

        <div className="grid min-w-0 gap-0 sm:grid-cols-2">
          {copy.chainItems.map((feature, i) => (
            <div
              className={cn(
                "relative min-w-0 border border-tint/[0.06] p-4 sm:p-5",
                i === 0 && "rounded-tl-xl sm:rounded-tl-xl",
                i === 1 && "rounded-tr-xl",
                i === 2 && "rounded-bl-xl",
                i === 3 && "rounded-br-xl",
              )}
              key={feature.title}
            >
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-accent/60">
                {feature.step}
              </span>
              <h3 className="mt-2 break-words text-base font-semibold text-ink sm:text-[1.05rem]">
                {feature.title}
              </h3>
              <p className="mt-2 break-words text-sm leading-6 text-muted">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function LadderSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-tint/10 bg-background/80">
      <Container className="section-space">
        <SectionIntro
          eyebrow={copy.growthEyebrow}
          title={copy.growthTitle}
          text={copy.growthText}
        />
        <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2 lg:grid-cols-4">
          {copy.ladder.map((step, i) => (
            <Card className="relative min-w-0 overflow-hidden p-5" key={step.title}>
              {/* Progression connector line */}
              {i < copy.ladder.length - 1 && (
                <span className="absolute right-0 top-7 hidden h-px w-4 bg-accent/20 lg:block" />
              )}
              <span className="block text-[0.6rem] font-bold uppercase tracking-[0.18em] text-accent/70">
                {step.level}
              </span>
              <h3 className="mt-3 break-words text-base font-semibold text-ink sm:text-lg">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.text}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function TrustSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-tint/10 bg-surface/35">
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
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted">
                {copy.scoreLabel}
              </p>
              <h3 className="mt-1.5 text-3xl font-semibold text-ink">82</h3>
            </div>
            <Badge tone="accent">{copy.scoreBadge}</Badge>
          </div>
          <div className="mt-5 grid gap-3.5">
            {copy.scores.map(([label, value]) => (
              <div key={label}>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="font-semibold tabular-nums text-accent-ink">{value}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-tint/[0.07]">
                  <span
                    className="block h-full rounded-full bg-accent transition-all duration-700"
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
    <section className="border-t border-tint/10 bg-background/80">
      <Container className="section-space">
        <SectionIntro
          eyebrow={copy.readerEyebrow}
          title={copy.readerTitle}
          text={copy.readerText}
        />
        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-4">
          {copy.readerBenefits.map((item) => (
            <Card className="min-w-0 p-4 sm:p-5" key={item}>
              <span className="block h-px w-8 bg-success/60" />
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
    <section className="border-t border-tint/10 bg-surface/35">
      <Container className="section-space">
        <div className="relative overflow-hidden rounded-xl border border-accent/25 bg-accent-soft/25 p-6 shadow-glow sm:p-10 lg:p-12">
          {/* Background grid pulse */}
          <div className="landing-radar pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative grid min-w-0 gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-ink/80">
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
    <footer className="border-t border-tint/10 bg-background/90">
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
