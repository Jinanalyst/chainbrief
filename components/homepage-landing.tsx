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
    heroBadge: "Market news into verified perspectives",
    heroTitle: "From market news to community-verified perspectives.",
    heroText:
      "Chain Brief is not just a crypto news summary site. It connects real-time briefs, Bull/Bear sentiment, community discussion, and analyst reputation so market news becomes shared, verified perspective.",
    primaryCta: "React to Market News",
    secondaryCta: "Build Analyst Credibility",
    heroStats: [
      { value: "24/7", label: "real-time briefs" },
      { value: "78%", label: "Bull/Bear sentiment" },
      { value: "84.6%", label: "verified accuracy" },
    ],
    liveFeed: [
      {
        tag: "BTC",
        title: "ETF inflow brief becomes a Bull/Bear sentiment board",
        meta: "418 reactions - 96 comments - 14 analyst views",
      },
      {
        tag: "SOL",
        title: "Community discussion turns a network upgrade into ranked perspectives",
        meta: "Rookie call verified - reputation +124",
      },
      {
        tag: "ETH",
        title: "Verified Analyst risk view anchors the restaking debate",
        meta: "Accuracy tracked - 2.1K followers reached",
      },
    ],
    progressEyebrow: "Core platform idea",
    progressTitle: "News becomes opinion. Opinion becomes reputation.",
    progressText:
      "Ordinary users can start with a reaction, write a post, earn engagement, and build a credibility record that moves them toward analyst status.",
    progression: [
      {
        title: "Community User",
        metric: "React",
        text: "Read real-time briefs, vote Bull or Bear, comment on market catalysts, and test a view in public.",
      },
      {
        title: "Rookie Analyst",
        metric: "Publish",
        text: "Turn reactions into posts with a clear thesis, evidence, and risk view. Engagement begins building credibility.",
      },
      {
        title: "Rising Analyst",
        metric: "Compound",
        text: "Consistent accuracy, useful discussion, and follower growth turn market opinion into a visible reputation.",
      },
      {
        title: "Verified Analyst",
        metric: "Verify",
        text: "Verified Analysts earn status through repeated signal quality, prediction accuracy, and community trust.",
      },
    ],
    howEyebrow: "Information flow",
    howTitle: "A simple path from headline to trusted analyst.",
    howText:
      "Each brief is a starting point. The platform adds sentiment, discussion, reputation, and verification around the people interpreting the market.",
    steps: [
      "News",
      "Opinion",
      "Discussion",
      "Reputation",
      "Verified Analyst",
    ],
    dashboardEyebrow: "Reputation layer",
    dashboardTitle: "Credibility is measured as the community reacts.",
    dashboardText:
      "The analyst profile makes participation legible: accuracy, followers, Bull/Bear success, trending posts, and reputation growth all sit beside the market view.",
    dashboardCards: [
      { label: "Analyst Score", value: "842", change: "+68 this month" },
      { label: "Accuracy", value: "84.6%", change: "31 resolved calls" },
      { label: "Followers", value: "12.8K", change: "+1.9K in 30d" },
      { label: "Bull/Bear Success", value: "71%", change: "BTC and SOL leading" },
    ],
    trendingPosts: [
      { title: "Why BTC range breaks above $72K if liquidity returns", signal: "Bull", score: "+184 rep" },
      { title: "The Bear case for AI tokens after unlock season", signal: "Bear", score: "+96 rep" },
      { title: "ETH restaking risk map before the next catalyst", signal: "Neutral", score: "+131 rep" },
    ],
    revenueLabel: "Reputation growth",
    revenueValue: "$3.2K",
    revenueText: "Projected future upside as trusted analysts unlock premium reports, subscriptions, and sponsored research opportunities.",
    communityEyebrow: "Verified perspectives",
    communityTitle: "The value is not the summary. It is the perspective built around it.",
    communityText:
      "Chain Brief gives every market event a social and reputational layer. Users react first, then discuss, write, earn trust, and help the community decide which perspectives deserve attention.",
    communityPoints: [
      "Real-time briefs become the shared reference point",
      "Bull/Bear sentiment shows the market's first reaction",
      "Community posts turn reactions into reasoned perspectives",
      "Accuracy and engagement build analyst reputation",
      "Rookie, Rising, and Verified tiers make credibility visible",
    ],
    finalTitle: "React to the news. Shape the discussion. Build a trusted name.",
    finalText:
      "Chain Brief turns market news into a verified perspective network for crypto.",
    writeCta: "Write a Perspective",
    applyCta: "Apply as Analyst",
    footer:
      "Chain Brief connects real-time crypto briefs, Bull/Bear sentiment, community discussion, and analyst reputation.",
  },
  en: {
    heroBadge: "Market news into verified perspectives",
    heroTitle: "From market news to community-verified perspectives.",
    heroText:
      "Chain Brief is not just a crypto news summary site. It connects real-time briefs, Bull/Bear sentiment, community discussion, and analyst reputation so market news becomes shared, verified perspective.",
    primaryCta: "React to Market News",
    secondaryCta: "Build Analyst Credibility",
    heroStats: [
      { value: "24/7", label: "real-time briefs" },
      { value: "78%", label: "Bull/Bear sentiment" },
      { value: "84.6%", label: "verified accuracy" },
    ],
    liveFeed: [
      {
        tag: "BTC",
        title: "ETF inflow brief becomes a Bull/Bear sentiment board",
        meta: "418 reactions - 96 comments - 14 analyst views",
      },
      {
        tag: "SOL",
        title: "Community discussion turns a network upgrade into ranked perspectives",
        meta: "Rookie call verified - reputation +124",
      },
      {
        tag: "ETH",
        title: "Verified Analyst risk view anchors the restaking debate",
        meta: "Accuracy tracked - 2.1K followers reached",
      },
    ],
    progressEyebrow: "Core platform idea",
    progressTitle: "News becomes opinion. Opinion becomes reputation.",
    progressText:
      "Ordinary users can start with a reaction, write a post, earn engagement, and build a credibility record that moves them toward analyst status.",
    progression: [
      {
        title: "Community User",
        metric: "React",
        text: "Read real-time briefs, vote Bull or Bear, comment on market catalysts, and test a view in public.",
      },
      {
        title: "Rookie Analyst",
        metric: "Publish",
        text: "Turn reactions into posts with a clear thesis, evidence, and risk view. Engagement begins building credibility.",
      },
      {
        title: "Rising Analyst",
        metric: "Compound",
        text: "Consistent accuracy, useful discussion, and follower growth turn market opinion into a visible reputation.",
      },
      {
        title: "Verified Analyst",
        metric: "Verify",
        text: "Verified Analysts earn status through repeated signal quality, prediction accuracy, and community trust.",
      },
    ],
    howEyebrow: "Information flow",
    howTitle: "A simple path from headline to trusted analyst.",
    howText:
      "Each brief is a starting point. The platform adds sentiment, discussion, reputation, and verification around the people interpreting the market.",
    steps: [
      "News",
      "Opinion",
      "Discussion",
      "Reputation",
      "Verified Analyst",
    ],
    dashboardEyebrow: "Reputation layer",
    dashboardTitle: "Credibility is measured as the community reacts.",
    dashboardText:
      "The analyst profile makes participation legible: accuracy, followers, Bull/Bear success, trending posts, and reputation growth all sit beside the market view.",
    dashboardCards: [
      { label: "Analyst Score", value: "842", change: "+68 this month" },
      { label: "Accuracy", value: "84.6%", change: "31 resolved calls" },
      { label: "Followers", value: "12.8K", change: "+1.9K in 30d" },
      { label: "Bull/Bear Success", value: "71%", change: "BTC and SOL leading" },
    ],
    trendingPosts: [
      { title: "Why BTC range breaks above $72K if liquidity returns", signal: "Bull", score: "+184 rep" },
      { title: "The Bear case for AI tokens after unlock season", signal: "Bear", score: "+96 rep" },
      { title: "ETH restaking risk map before the next catalyst", signal: "Neutral", score: "+131 rep" },
    ],
    revenueLabel: "Reputation growth",
    revenueValue: "$3.2K",
    revenueText: "Projected future upside as trusted analysts unlock premium reports, subscriptions, and sponsored research opportunities.",
    communityEyebrow: "Verified perspectives",
    communityTitle: "The value is not the summary. It is the perspective built around it.",
    communityText:
      "Chain Brief gives every market event a social and reputational layer. Users react first, then discuss, write, earn trust, and help the community decide which perspectives deserve attention.",
    communityPoints: [
      "Real-time briefs become the shared reference point",
      "Bull/Bear sentiment shows the market's first reaction",
      "Community posts turn reactions into reasoned perspectives",
      "Accuracy and engagement build analyst reputation",
      "Rookie, Rising, and Verified tiers make credibility visible",
    ],
    finalTitle: "React to the news. Shape the discussion. Build a trusted name.",
    finalText:
      "Chain Brief turns market news into a verified perspective network for crypto.",
    writeCta: "Write a Perspective",
    applyCta: "Apply as Analyst",
    footer:
      "Chain Brief connects real-time crypto briefs, Bull/Bear sentiment, community discussion, and analyst reputation.",
  },
} as const;

type LandingCopy = (typeof landingCopy)[keyof typeof landingCopy];

export function HomepageLanding() {
  const [preferences] = usePreferences();
  const copy = landingCopy[preferences.language] ?? landingCopy.en;

  return (
    <>
      <HeroSection copy={copy} />
      <ProgressionSection copy={copy} />
      <HowItWorksSection copy={copy} />
      <DashboardSection copy={copy} />
      <CommunitySignalSection copy={copy} />
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
        <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.82fr)] lg:items-center">
          <div className="min-w-0 max-w-4xl">
            <Badge tone="accent">{copy.heroBadge}</Badge>
            <h1 className="mt-5 max-w-4xl text-balance break-words text-4xl font-semibold leading-[1.08] text-ink sm:text-6xl lg:text-7xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {copy.heroText}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto" href="/community">
                {copy.primaryCta}
              </Button>
              <Button className="w-full sm:w-auto" href="/analyst/apply" variant="secondary">
                {copy.secondaryCta}
              </Button>
            </div>
            <div className="mt-8 grid gap-3 border-t border-tint/[0.08] pt-6 sm:grid-cols-3">
              {copy.heroStats.map((stat) => (
                <div className="min-w-0" key={stat.label}>
                  <p className="text-2xl font-semibold tabular-nums text-ink">{stat.value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase leading-5 tracking-[0.12em] text-muted-2">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-lg border border-accent/20 bg-surface/90 shadow-glow backdrop-blur">
              <div className="landing-radar absolute inset-0 opacity-35" />
              <div className="relative border-b border-tint/[0.08] px-4 py-3">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">
                    Live market room
                  </p>
                  <span className="rounded-full border border-success/25 bg-success/10 px-2 py-1 text-[0.65rem] font-bold text-success">
                    Open
                  </span>
                </div>
              </div>
              <div className="relative space-y-3 p-4 sm:p-5">
                {copy.liveFeed.map((item, index) => (
                  <div
                    className="landing-float min-w-0 rounded-md border border-tint/10 bg-background/78 p-4"
                    key={item.title}
                    style={{ animationDelay: `${index * 0.45}s` }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="rounded border border-accent/30 bg-accent/10 px-2 py-1 text-[0.65rem] font-bold text-accent-ink">
                        {item.tag}
                      </span>
                      <div className="h-1.5 w-1.5 rounded-full bg-success" />
                      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-2">
                        Community signal
                      </span>
                    </div>
                    <p className="mt-3 break-words text-sm font-semibold leading-6 text-ink">
                      {item.title}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted">{item.meta}</p>
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

function ProgressionSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-tint/10 bg-background/88">
      <Container className="section-space">
        <SectionIntro
          eyebrow={copy.progressEyebrow}
          text={copy.progressText}
          title={copy.progressTitle}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {copy.progression.map((step, index) => (
            <Card className="relative min-w-0 overflow-hidden p-5 sm:p-6" key={step.title}>
              {index < copy.progression.length - 1 && (
                <span className="absolute right-0 top-8 hidden h-px w-6 bg-accent/40 lg:block" />
              )}
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-accent">
                {step.metric}
              </p>
              <h3 className="mt-3 break-words text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{step.text}</p>
            </Card>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-accent/25 bg-accent-soft/20 p-4 text-center text-sm font-semibold text-accent-ink">
          News -&gt; Opinion -&gt; Discussion -&gt; Reputation -&gt; Verified Analyst
        </div>
      </Container>
    </section>
  );
}

function HowItWorksSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-tint/10 bg-surface/35">
      <Container className="section-space">
        <SectionIntro eyebrow={copy.howEyebrow} text={copy.howText} title={copy.howTitle} />
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {copy.steps.map((step, index) => (
            <div
              className="group min-w-0 rounded-lg border border-tint/[0.08] bg-background/65 p-4 transition hover:border-accent/40 hover:bg-accent-soft/20"
              key={step}
            >
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-accent/70">
                0{index + 1}
              </span>
              <p className="mt-4 break-words text-sm font-semibold leading-6 text-ink">
                {step}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function DashboardSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-tint/10 bg-background/88">
      <Container className="section-space grid min-w-0 gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {copy.dashboardEyebrow}
          </p>
          <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
            {copy.dashboardTitle}
          </h2>
          <p className="mt-4 text-base leading-8 text-muted">{copy.dashboardText}</p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-tint/10 bg-surface/90 shadow-soft">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-tint/[0.08] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">
                Analyst cockpit
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">Rookie to Verified reputation view</p>
            </div>
            <Badge tone="accent">Rank #42</Badge>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {copy.dashboardCards.map((card) => (
              <div className="min-w-0 rounded-md border border-tint/[0.08] bg-background/65 p-4" key={card.label}>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted-2">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">{card.value}</p>
                <p className="mt-1 text-xs leading-5 text-success">{card.change}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 border-t border-tint/[0.08] p-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">
                Trending posts
              </p>
              <div className="mt-3 grid gap-2">
                {copy.trendingPosts.map((post) => (
                  <div className="min-w-0 rounded-md border border-tint/[0.07] bg-background/55 p-3" key={post.title}>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded px-2 py-1 text-[0.65rem] font-bold",
                          post.signal === "Bull" && "bg-success/12 text-success",
                          post.signal === "Bear" && "bg-danger/12 text-danger",
                          post.signal === "Neutral" && "bg-tint/[0.06] text-muted",
                        )}
                      >
                        {post.signal}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-accent-ink">
                        {post.score}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold leading-5 text-ink">
                      {post.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-md border border-accent/20 bg-accent-soft/20 p-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-accent-ink/80">
                {copy.revenueLabel}
              </p>
              <p className="mt-3 text-4xl font-semibold tabular-nums text-ink">
                {copy.revenueValue}
              </p>
              <div className="mt-4 h-28 overflow-hidden rounded border border-tint/[0.08] bg-background/55 p-3">
                <div className="flex h-full items-end gap-2">
                  {[28, 42, 36, 58, 64, 78, 92].map((height, index) => (
                    <span
                      className="block flex-1 rounded-t bg-accent"
                      key={height + index}
                      style={{ height: `${height}%`, opacity: 0.42 + index * 0.07 }}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">{copy.revenueText}</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function CommunitySignalSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-tint/10 bg-surface/35">
      <Container className="section-space grid min-w-0 gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {copy.communityEyebrow}
          </p>
          <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
            {copy.communityTitle}
          </h2>
          <p className="mt-4 text-base leading-8 text-muted">{copy.communityText}</p>
        </div>
        <div className="grid min-w-0 gap-3">
          {copy.communityPoints.map((point) => (
            <div className="min-w-0 rounded-lg border border-tint/[0.08] bg-background/65 p-4" key={point}>
              <p className="break-words text-sm font-semibold leading-6 text-ink">{point}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FinalCtaSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-t border-tint/10 bg-background/88">
      <Container className="section-space">
        <div className="relative overflow-hidden rounded-xl border border-accent/25 bg-accent-soft/25 p-6 shadow-glow sm:p-10 lg:p-12">
          <div className="landing-radar pointer-events-none absolute inset-0 opacity-25" />
          <div className="relative grid min-w-0 gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <h2 className="break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
                {copy.finalTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{copy.finalText}</p>
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
    <footer className="border-t border-tint/10 bg-background/92">
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
