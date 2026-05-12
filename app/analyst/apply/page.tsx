import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  getCurrentUserContext,
  getLatestApplicationForUser,
} from "@/lib/analyst-data";
import { submitAnalystApplicationAction } from "@/lib/analyst-actions";

const EXPERTISE_OPTIONS = ["Bitcoin", "Ethereum", "Solana", "DeFi", "Macro", "Layer2"] as const;
const EXPERIENCE_OPTIONS = [
  { value: "lt_1", label: "<1" },
  { value: "1_3", label: "1-3" },
  { value: "3_5", label: "3-5" },
  { value: "5_plus", label: "5+" },
] as const;

const ANALYST_PATH = [
  {
    title: "Regular User",
    description:
      "Participates in the community, comments on news, and joins Bull/Bear discussions.",
  },
  {
    title: "Rookie Analyst",
    description: "Starts writing news interpretation, chart analysis, reviews, and risk notes.",
  },
  {
    title: "Rising Analyst",
    description: "Builds credibility through consistent, high-quality posts and engagement.",
  },
  {
    title: "Verified Analyst",
    description:
      "A trusted analyst reviewed by Chain Brief based on writing quality, risk awareness, and community trust.",
  },
  {
    title: "Partner Expert",
    description:
      "A top-level analyst who may participate in premium research, reward pools, and future revenue sharing.",
  },
] as const;

const ANALYST_DISCLAIMER =
  "This content is for informational and educational purposes only and is not financial advice. Crypto assets involve risk of loss. All investment decisions are the sole responsibility of the user.";
const ANALYST_NO_PROMISES =
  "Chain Brief does not provide 1:1 investment advice, buy/sell instructions, guaranteed returns, or principal protection.";

export default async function AnalystApplyPage() {
  if (!hasSupabaseConfig) {
    return (
      <main className="site-grid min-h-screen overflow-hidden">
        <Header />
        <Container className="section-space">
          <Card className="p-6">
            <p className="text-lg font-semibold text-ink">Supabase is not configured.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to
              `.env.local`.
            </p>
          </Card>
        </Container>
      </main>
    );
  }

  const { user } = await getCurrentUserContext();

  if (!user) {
    redirect("/login?next=/analyst/apply");
  }

  const latestApplication = await getLatestApplicationForUser(user.id);

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_20rem]">
            <Card className="min-w-0 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Verified Analyst Application
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Apply to grow from reader to analyst.
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Share your background, analysis style, and sample work. Chain Brief reviews the
                application quality, risk awareness, and community value.
              </p>

              {latestApplication ? (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Latest application
                  </p>
                  <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
                    <p>Status: <span className="font-semibold text-ink">{latestApplication.status}</span></p>
                    <p>Applied at: {formatDate(latestApplication.applied_at)}</p>
                    <p>Expertise: {latestApplication.expertise_areas.join(", ")}</p>
                  </div>
                  <div className="mt-4">
                    <Button href="/analyst/status" variant="secondary">
                      View status
                    </Button>
                  </div>
                </div>
              ) : null}

              <form className="mt-6 grid gap-5" action={submitAnalystApplicationAction}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Full name
                    </span>
                    <input
                      className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                      name="full_name"
                      required
                      placeholder="Your legal or display name"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Twitter / X handle
                    </span>
                    <input
                      className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                      name="twitter_handle"
                      placeholder="@yourhandle"
                    />
                  </label>
                </div>

                <fieldset className="grid gap-3">
                  <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Expertise
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {EXPERTISE_OPTIONS.map((item) => (
                      <label
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink"
                        key={item}
                      >
                        <input name="expertise_areas" type="checkbox" value={item} />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Experience years
                  </span>
                  <select
                    className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                    name="experience_years"
                    defaultValue="lt_1"
                  >
                    {EXPERIENCE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Short bio
                  </span>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                    maxLength={300}
                    name="bio"
                    required
                    placeholder="Who you are and how you approach market analysis."
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Sample analysis link
                  </span>
                  <input
                    className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                    name="sample_link"
                    required
                    type="url"
                    placeholder="https://"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Motivation
                  </span>
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                    maxLength={500}
                    name="motivation"
                    required
                    placeholder="Why do you want to become a Verified Analyst on Chain Brief?"
                  />
                </label>

                <Button type="submit">Submit application</Button>
              </form>
            </Card>

            <aside className="space-y-3">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Analyst Path
                </p>
                <div className="mt-3 grid gap-3">
                  {ANALYST_PATH.map((step, index) => (
                    <div
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      key={step.title}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                        Step {index + 1}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink">{step.title}</p>
                      <p className="mt-2 text-xs leading-5 text-muted">{step.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Disclaimer
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">{ANALYST_DISCLAIMER}</p>
                <p className="mt-3 text-sm leading-6 text-muted">{ANALYST_NO_PROMISES}</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Next step
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  After submitting, you can track the review result on the status page.
                </p>
                <div className="mt-4">
                  <Button href="/analyst/status" variant="secondary">
                    Go to status
                  </Button>
                </div>
              </Card>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
