export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { AnalystApplyForm } from "@/components/analyst-apply-form";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  getCurrentUserContext,
  getLatestApplicationForUser,
} from "@/lib/analyst-data";

const ANALYST_PATH = [
  {
    title: "Regular User",
    description:
      "Participates in the community, comments on news, and joins Bull/Bear discussions.",
  },
  {
    title: "Rookie Analyst",
    description:
      "Starts writing news interpretation, chart analysis, reviews, and risk notes.",
  },
  {
    title: "Rising Analyst",
    description:
      "Builds credibility through consistent, high-quality posts and engagement.",
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

export default async function AnalystApplyPage() {
  // ── Guard: Supabase must be configured ──────────────────────────────────────
  if (!hasSupabaseConfig) {
    return (
      <main className="site-grid min-h-screen overflow-hidden">
        <Header />
        <Container className="section-space">
          <Card className="p-6">
            <p className="text-lg font-semibold text-ink">
              Supabase is not configured.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to your
              environment variables.
            </p>
          </Card>
        </Container>
      </main>
    );
  }

  // ── Load user — wrapped so a Supabase outage never crashes the page ─────────
  let user = null;
  let latestApplication = null;

  try {
    const ctx = await getCurrentUserContext();
    user = ctx.user;
  } catch {
    // Supabase unreachable — fall through and show login prompt
  }

  if (!user) {
    redirect("/login?next=/analyst/apply");
  }

  try {
    latestApplication = await getLatestApplicationForUser(user.id);
  } catch {
    // Non-fatal: table may not exist yet, application list just shows empty
  }

  // Already approved → go to dashboard
  if (latestApplication?.status === "approved") {
    redirect("/analyst/dashboard");
  }

  // Pending → go to status
  if (latestApplication?.status === "pending") {
    redirect("/analyst/status");
  }

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_20rem]">

            {/* ── Application form card ── */}
            <Card className="min-w-0 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Verified Analyst Application
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Apply to grow from reader to analyst.
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Share your background, analysis style, and sample work. Chain
                Brief reviews the application quality, risk awareness, and
                community value.
              </p>

              {/* Rejected status notice */}
              {latestApplication?.status === "rejected" && (
                <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
                    Previous application rejected
                  </p>
                  {latestApplication.rejection_reason && (
                    <p className="mt-2 text-sm leading-6 text-rose-200">
                      {latestApplication.rejection_reason}
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Applied:{" "}
                    {new Intl.DateTimeFormat("ko-KR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(latestApplication.applied_at))}
                    {" · "}You may re-apply 30 days after your previous
                    submission.
                  </p>
                </div>
              )}

              {/* The form itself lives in a Client Component so it can use useActionState */}
              <AnalystApplyForm
                hasExistingApplication={latestApplication !== null}
              />
            </Card>

            {/* ── Sidebar ── */}
            <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Analyst Path
                </p>
                <div className="mt-3 grid gap-3">
                  {ANALYST_PATH.map((step, index) => (
                    <div
                      key={step.title}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                        Step {index + 1}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {step.title}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  What happens next?
                </p>
                <div className="mt-3 grid gap-3 text-sm leading-6 text-muted">
                  <p>
                    1. Your application is reviewed by the Chain Brief team,
                    typically within 3–5 business days.
                  </p>
                  <p>
                    2. You'll be notified via the status page. If approved, your
                    analyst dashboard unlocks immediately.
                  </p>
                  <p>
                    3. Once active, you can enable a membership, set your price,
                    and start publishing premium content.
                  </p>
                </div>
                <div className="mt-4">
                  <Button href="/analyst/status" variant="secondary">
                    Check status
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Disclaimer
                </p>
                <p className="mt-3 text-xs leading-5 text-muted">
                  This content is for informational and educational purposes
                  only and is not financial advice. Crypto assets involve risk
                  of loss. All investment decisions are the sole responsibility
                  of the user.
                </p>
              </Card>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}
