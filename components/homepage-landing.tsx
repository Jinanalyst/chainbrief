import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/brand-logo";

const heroCards = [
  {
    label: "News",
    source: "CoinDesk",
    title: "Bitcoin ETF flows reset the weekly market narrative",
  },
  {
    label: "Research",
    source: "Bankless",
    title: "Ethereum rollup economics and liquidity rotation",
  },
  {
    label: "Signal",
    source: "Browser Alert",
    title: "SEC, Solana, and macro keywords matched",
  },
];

const keyPoints = [
  {
    title: "Easy to start, no crypto knowledge required",
    text: "Your first brief takes less than two minutes to read. No jargon, no experience needed — just plain language and today's most important stories.",
  },
  {
    title: "Learn gradually through daily reading habits",
    text: "Small steps add up. Read one brief today, follow a topic tomorrow, and within weeks you'll have a real understanding of how the market moves.",
  },
  {
    title: "Build your investment perspective over time",
    text: "Anyone can become a crypto expert through consistent learning. Chain Brief gives you the daily habit that makes it possible.",
  },
];

const steps = [
  {
    label: "01",
    title: "Pick what interests you",
    text: "Choose from beginner-friendly news sources or research feeds. No prior knowledge needed — curiosity is enough to start.",
  },
  {
    label: "02",
    title: "Follow topics as you learn",
    text: "As you grow more comfortable, start following the themes and keywords that match your curiosity — Bitcoin, DeFi, regulation, or anything else.",
  },
  {
    label: "03",
    title: "Build your daily reading habit",
    text: "Come back each day to your personal feed. Your understanding builds brief by brief, until the market starts to feel familiar.",
  },
];

const growthSteps = [
  {
    level: "Beginner",
    label: "01",
    title: "Read today's news",
    text: "Start with the headlines. No background required — just pick a story that catches your eye and read.",
  },
  {
    level: "Novice",
    label: "02",
    title: "Follow keywords and track trends",
    text: "Once you know a few names — Bitcoin, Ethereum, DeFi — start following them and watch the patterns emerge.",
  },
  {
    level: "Intermediate",
    label: "03",
    title: "Dive into research feeds",
    text: "Go deeper with YouTube research feeds and multi-source discovery. You're no longer just reading the news — you're studying the market.",
  },
  {
    level: "Expert",
    label: "04",
    title: "Build your own investment perspective",
    text: "With consistent reading behind you, you can form your own view on where the market is heading — and act with confidence.",
  },
];

const previewItems = [
  {
    label: "News",
    source: "Cointelegraph",
    title: "Stablecoin bill moves into final Senate negotiations",
    text: "RSS brief with source, category, and keyword context.",
    status: "Live",
  },
  {
    label: "Research",
    source: "Coin Bureau",
    title: "Macro liquidity and the next crypto cycle",
    text: "YouTube RSS research feed without API keys.",
    status: "Live",
  },
  {
    label: "SNS",
    source: "Telegram / X / Mirror",
    title: "Protocol and creator signals in one feed",
    text: "Structured for future social integrations.",
    status: "Coming Soon",
  },
];

const personalizationItems = [
  "Follow Bitcoin ETF",
  "Follow Solana",
  "Exclude Meme Coins",
  "Follow Macro",
  "Browser notifications",
];

const futureItems = [
  "AI summaries",
  "Telegram alerts",
  "SNS integrations",
  "Personalized notifications",
  "Multi-language support",
];

export function HomepageLanding() {
  return (
    <>
      <HeroSection />
      <WhatIsSection />
      <HowItWorksSection />
      <GrowthJourneySection />
      <FeedPreviewSection />
      <WhySection />
      <PersonalizationSection />
      <FutureSection />
      <FinalCtaSection />
      <LandingFooter />
    </>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-background/72">
      <div className="landing-signal-bg absolute inset-0" />
      <Container className="relative grid min-h-[calc(100vh-4.25rem)] min-w-0 gap-8 pb-12 pt-10 sm:gap-10 sm:pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-center lg:pb-20 lg:pt-20">
        <div className="min-w-0 max-w-3xl">
          <Badge tone="accent">Chain Brief</Badge>
          <h1 className="mt-5 max-w-4xl break-words text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:mt-6 sm:text-6xl lg:text-7xl">
            Your first step into crypto starts here.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:mt-6 sm:text-lg sm:leading-8">
            Chain Brief delivers today&apos;s most important crypto stories in plain
            language — no experience needed. Start learning one brief at a time,
            and grow into your own investment perspective.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" href="/briefs">Read Today&apos;s Brief</Button>
            <Button className="w-full sm:w-auto" href="/settings" variant="secondary">
              Customize Feed
            </Button>
          </div>
        </div>

        <div className="relative min-h-[22rem] overflow-hidden sm:min-h-[26rem]">
          <div className="landing-radar absolute inset-0 rounded-lg border border-accent/20 bg-accent-soft/10" />
          <div className="absolute inset-x-3 top-6 space-y-3 sm:inset-x-8 sm:top-8">
            {heroCards.map((item, index) => (
              <div
                className="landing-float min-w-0 rounded-lg border border-white/10 bg-surface/88 p-3 shadow-soft backdrop-blur sm:p-4"
                key={item.title}
                style={{ animationDelay: `${index * 0.75}s` }}
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="rounded bg-accent/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-blue-200">
                    {item.label}
                  </span>
                  <span className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
                    {item.source}
                  </span>
                </div>
                <p className="mt-3 break-words text-sm font-semibold leading-6 text-ink">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function WhatIsSection() {
  return (
    <section className="border-t border-white/10 bg-background/80">
      <Container className="section-space grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            What is Chain Brief
          </p>
          <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
            You don&apos;t need to be an expert to understand crypto.
          </h2>
          <p className="mt-5 text-base leading-8 text-muted">
            Chain Brief breaks down today&apos;s most important crypto stories into
            short, clear briefs — designed for curious beginners and growing
            investors alike.
          </p>
          <p className="mt-4 text-base leading-8 text-muted">
            Read a little every day, and you&apos;ll be surprised how quickly the
            pieces start to connect.
          </p>
        </div>

        <div className="grid min-w-0 gap-3">
          {keyPoints.map((point) => (
            <Card className="min-w-0 p-4 sm:p-5" key={point.title}>
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_18px_rgba(47,123,255,0.75)]" />
                <div className="min-w-0">
                  <p className="min-w-0 break-words text-base font-semibold text-ink sm:text-lg">{point.title}</p>
                  <p className="mt-1.5 break-words text-sm leading-6 text-muted">{point.text}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="border-t border-white/10 bg-surface/35">
      <Container className="section-space">
        <SectionIntro
          eyebrow="How it works"
          title="Three simple steps to start your crypto journey."
          text="No setup required. Just show up, read, and grow — one brief at a time."
        />
        <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
          {steps.map((step) => (
            <Card className="min-w-0 p-4 sm:p-5" key={step.title}>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                {step.label}
              </span>
              <h3 className="mt-4 break-words text-lg font-semibold text-ink sm:text-xl">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{step.text}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function GrowthJourneySection() {
  return (
    <section className="border-t border-white/10 bg-surface/35">
      <Container className="section-space">
        <SectionIntro
          eyebrow="Your growth journey"
          title="Everyone starts as a beginner. Here's where you're headed."
          text="Chain Brief is built around one belief: consistent daily reading turns any newcomer into a confident crypto investor."
        />
        <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2 lg:grid-cols-4">
          {growthSteps.map((step) => (
            <Card className="relative min-w-0 p-4 sm:p-5" key={step.label}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {step.label}
                </span>
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-blue-200">
                  {step.level}
                </span>
              </div>
              <h3 className="break-words text-lg font-semibold text-ink sm:text-xl">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{step.text}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FeedPreviewSection() {
  return (
    <section className="border-t border-white/10 bg-background/80">
      <Container className="section-space">
        <SectionIntro
          eyebrow="Feed preview"
          title="News, research, and future SNS signals in one rhythm."
          text="The interface is built for fast scanning, not endless scrolling."
        />
        <div className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-surface/78 sm:mt-8">
          {previewItems.map((item) => (
            <article
              className="grid min-w-0 gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 md:grid-cols-[8rem_minmax(0,1fr)_8rem] md:items-center"
              key={item.title}
            >
              <div className="min-w-0">
                <span className="rounded bg-accent/15 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-blue-200">
                  {item.label}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-2">
                  {item.source}
                </p>
                <h3 className="mt-2 break-words text-base font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">{item.text}</p>
              </div>
              <Badge tone={item.status === "Live" ? "accent" : "muted"}>
                {item.status}
              </Badge>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

function WhySection() {
  return (
    <section className="border-t border-white/10 bg-surface/35">
      <Container className="section-space grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Why it exists
          </p>
          <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
            Less noise. More context.
          </h2>
        </div>
        <div className="grid min-w-0 gap-4 text-base leading-7 text-muted sm:leading-8">
          <p>
            Crypto information overload is real. Headlines break on RSS,
            research lands on YouTube, and social updates fragment across too
            many tabs and apps.
          </p>
          <p>
            Chain Brief is built around the idea that research and context
            matter. The product should help you filter, compare, and return to
            signal faster.
          </p>
        </div>
      </Container>
    </section>
  );
}

function PersonalizationSection() {
  return (
    <section className="border-t border-white/10 bg-background/80">
      <Container className="section-space">
        <SectionIntro
          eyebrow="Personalization"
          title="Shape the feed around your thesis."
          text="Use filters, keywords, exclusions, and browser notifications to keep important stories visible."
        />
        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-5">
          {personalizationItems.map((item) => (
            <Card className="min-w-0 p-4" key={item}>
              <span className="block h-1.5 w-8 rounded-full bg-accent" />
              <p className="mt-4 break-words text-sm font-semibold leading-6 text-ink">{item}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FutureSection() {
  return (
    <section className="border-t border-white/10 bg-surface/35">
      <Container className="section-space">
        <SectionIntro
          eyebrow="Future expansion"
          title="Designed for a wider crypto signal ecosystem."
          text="The architecture is ready to expand beyond today's RSS and YouTube foundations."
        />
        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-5">
          {futureItems.map((item) => (
            <Card className="min-w-0 p-4" key={item}>
              <Badge tone="muted">Coming Soon</Badge>
              <p className="mt-4 break-words text-sm font-semibold text-ink">{item}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="border-t border-white/10 bg-background/80">
      <Container className="section-space">
        <div className="overflow-hidden rounded-lg border border-accent/25 bg-accent-soft/25 p-5 shadow-glow sm:p-8 lg:p-10">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                Start now
              </p>
              <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-4xl">
                Anyone can become a crypto expert. Start today.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Button className="w-full sm:w-auto" href="/briefs">Start Your First Briefing</Button>
              <Button className="w-full sm:w-auto" href="/settings" variant="secondary">
                Customize Your Feed
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-background/90">
      <Container className="flex min-w-0 flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <BrandLogo compact className="max-w-full" />
        <p className="max-w-xl text-sm leading-6 text-muted">
          Chain Brief organizes public RSS and creator feeds for fast research.
        </p>
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
