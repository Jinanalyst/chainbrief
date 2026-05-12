export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getCurrentUserContext, getLatestApplicationForUser } from "@/lib/analyst-data";

export default async function AnalystStatusPage() {
  if (!hasSupabaseConfig) {
    return (
      <main className="site-grid min-h-screen overflow-hidden">
        <Header />
        <Container className="section-space">
          <Card className="p-6">
            <p className="text-lg font-semibold text-ink">Supabase is not configured.</p>
          </Card>
        </Container>
      </main>
    );
  }

  const { user } = await getCurrentUserContext();
  if (!user) {
    redirect("/login?next=/analyst/status");
  }

  const application = await getLatestApplicationForUser(user.id);
  if (!application) {
    redirect("/analyst/apply");
  }

  const reapplyAt = new Date(application.applied_at);
  reapplyAt.setDate(reapplyAt.getDate() + 30);
  const canReapply = application.status === "rejected" && new Date() >= reapplyAt;

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto grid max-w-4xl gap-6">
            <Card className="min-w-0 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Application status
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                {application.status === "pending"
                  ? "신청서를 검토하고 있어요"
                  : application.status === "approved"
                    ? "합격을 축하해요!"
                    : "신청 결과를 확인하세요"}
              </h1>

              <div className="mt-5 grid gap-3 text-sm leading-6 text-muted">
                <StatusLine label="Submitted date" value={formatDate(application.applied_at)} />
                <StatusLine label="Expertise" value={application.expertise_areas.join(", ")} />
                <StatusLine label="Experience" value={experienceLabel(application.experience_years)} />
              </div>

              {application.status === "pending" ? (
                <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <p className="text-sm leading-6 text-amber-100">
                    Your application is being reviewed. We will update this page after the review
                    is complete.
                  </p>
                </div>
              ) : null}

              {application.status === "approved" ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button href="/analyst/dashboard">Open dashboard</Button>
                  <Button href="/community/write" variant="secondary">
                    Write as analyst
                  </Button>
                </div>
              ) : null}

              {application.status === "rejected" ? (
                <div className="mt-6 grid gap-3">
                  <Card className="border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      Rejection reason
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {application.rejection_reason || "No reason was provided."}
                    </p>
                  </Card>

                  <div className="flex flex-wrap gap-2">
                    {canReapply ? (
                      <Button href="/analyst/apply">재신청하기</Button>
                    ) : (
                      <Button disabled type="button">
                        재신청하기
                      </Button>
                    )}
                    <Button href="/analyst/apply" variant="secondary">
                      Back to application
                    </Button>
                  </div>
                  {!canReapply ? (
                    <p className="text-xs leading-5 text-muted-2">
                      You can reapply 30 days after the previous submission.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Status
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {application.status === "pending"
                    ? "Pending review"
                    : application.status === "approved"
                      ? "Approved"
                      : "Rejected"}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Next move
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {application.status === "pending"
                    ? "Wait for the review team."
                    : application.status === "approved"
                      ? "Open your analyst dashboard."
                      : "Review the feedback and reapply later."}
                </p>
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function experienceLabel(value: string) {
  switch (value) {
    case "lt_1":
      return "<1 year";
    case "1_3":
      return "1-3 years";
    case "3_5":
      return "3-5 years";
    case "5_plus":
      return "5+ years";
    default:
      return value;
  }
}
