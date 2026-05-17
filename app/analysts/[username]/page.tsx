export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  getApprovedAnalystProfile,
  getCurrentUserContext,
} from "@/lib/analyst-data";

const PLATFORM_POINTS = [
  {
    label: "Publish",
    title: "Turn market judgment into a public track record.",
    body: "Build a home for your calls, frameworks, chart notes, and long-form research.",
  },
  {
    label: "Grow",
    title: "Convert readers into a durable audience.",
    body: "Bring followers into one analyst page with subscriptions, inbox delivery, and community discovery.",
  },
  {
    label: "Earn",
    title: "Open paid memberships when your work is ready.",
    body: "Package premium research, member-only updates, and recurring access around your strongest ideas.",
  },
] as const;

const CREATOR_METRICS = [
  { value: "01", label: "Verified analyst profile" },
  { value: "70%", label: "Analyst revenue share" },
  { value: "$1+", label: "Flexible monthly pricing" },
] as const;

const PROGRAM_STEPS = [
  "Apply with your market background and sample analysis.",
  "Get reviewed for clarity, risk awareness, and reader value.",
  "Launch your analyst page, publish consistently, and build paid memberships.",
] as const;

export default async function AnalystRootPage() {
  let shouldOpenDashboard = false;

  if (hasSupabaseConfig) {
    try {
      const { user } = await getCurrentUserContext();

      if (user) {
        const approved = await getApprovedAnalystProfile(user.id);

        if (approved) {
          shouldOpenDashboard = true;
        }
      }
    } catch {
      // Keep the public landing page available if auth or analyst tables are unreachable.
    }
  }

  if (shouldOpenDashboard) {
    redirect("/analyst/dashboard");
  }

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-20">
      <Header />

      <section className="relative overflow-hidden border-t border-tint/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(47,123,255,0.2),transparent_28rem),radial-gradient(circle_at_78%_18%,rgba(37,198,133,0.13),transparent_24rem),linear-gradient(180deg,rgba(13,17,28,0.7),rgba(7,10,18,0.96))]" />
        <Container className="section-space">
          <div className="grid min-h-[calc(100vh-7rem)] items-center gap-10 py-4 lg:grid-cols-[minmax(0,1.03fr)_minmax(24rem,0.72fr)]">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-md border border-tint/12 bg-tint/[0.06] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Chain Brief Analyst Program
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl">
                Build Your Financial Identity.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
                Become the analyst readers remember. Publish investment ideas,
                market breakdowns, and premium research from a verified creator
                profile built for audience growth and paid memberships.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button className="min-w-48" href="/analyst/apply">
                  Start building
                </Button>
                <Button className="min-w-48" href="/analysts" variant="secondary">
                  Explore analysts
                </Button>
              </div>
            </div>

            <aside className="relative min-h-[34rem] overflow-hidden rounded-lg border border-tint/12 bg-[#0b101a]/88 p-5 shadow-glow backdrop-blur">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-success to-tint/70" />
              <div className="flex items-center justify-between gap-4 border-b border-tint/10 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Creator Studio
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink">
                    Your analyst page
                  </p>
                </div>
                <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-success">
                  Verified
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {CREATOR_METRICS.map((metric) => (
                  <div
                    className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-4 rounded-md border border-tint/10 bg-tint/[0.04] p-4"
                    key={metric.label}
                  >
                    <span className="text-2xl font-semibold text-ink">
                      {metric.value}
                    </span>
                    <span className="text-sm leading-5 text-muted">
                      {metric.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-md border border-tint/10 bg-background/80 p-4">
                <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  <span>Audience growth</span>
                  <span>Members</span>
                </div>
                <div className="mt-4 grid gap-3">
                  {[78, 64, 88, 52].map((width, index) => (
                    <div className="h-2 overflow-hidden rounded-full bg-tint/10" key={width}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-success"
                        style={{ width: `${width - index * 4}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-md border border-tint/10 bg-tint/[0.04] p-4">
                <p className="text-sm font-semibold text-ink">
                  Premium membership
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Offer recurring access to deeper research, private updates,
                  and your highest-conviction market work.
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <section className="border-y border-tint/10 bg-surface/46">
        <Container className="py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {PLATFORM_POINTS.map((point) => (
              <article
                className="rounded-lg border border-tint/10 bg-tint/[0.035] p-5"
                key={point.label}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {point.label}
                </p>
                <h2 className="mt-4 text-xl font-semibold leading-7 text-ink">
                  {point.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-background/78">
        <Container className="section-space">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Not a form. A platform.
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Create the financial publication your audience can subscribe to.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                Chain Brief gives credible market voices a premium place to be
                discovered, followed, and supported. The application is only
                the entry point; the destination is a trusted analyst identity
                with an audience and a revenue engine behind it.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button href="/analyst/apply">Become an analyst</Button>
                <Button href="/analyst/status" variant="secondary">
                  Check status
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {PROGRAM_STEPS.map((step, index) => (
                <div
                  className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 rounded-lg border border-tint/10 bg-surface/78 p-5"
                  key={step}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-md border border-tint/10 bg-tint/[0.04] text-sm font-semibold text-ink">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {index === 0
                        ? "Signal"
                        : index === 1
                          ? "Verification"
                          : "Monetization"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
