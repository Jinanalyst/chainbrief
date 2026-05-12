import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  getApprovedAnalystProfile,
  getCurrentUserContext,
  getAnalystDashboardSnapshot,
} from "@/lib/analyst-data";
import { saveAnalystDashboardSettingsAction } from "@/lib/analyst-actions";

export default async function AnalystDashboardPage() {
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
    redirect("/login?next=/analyst/dashboard");
  }

  const approved = await getApprovedAnalystProfile(user.id);
  if (!approved) {
    redirect("/analyst/status");
  }

  const snapshot = await getAnalystDashboardSnapshot(user.id);
  const maxRevenue = Math.max(...snapshot.revenueBars.map((bar) => bar.amount), 0, 1);

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto grid max-w-7xl gap-6">
            <Card className="min-w-0 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Analyst Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Manage your analyst membership and revenue.
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Chain Brief keeps the analyst economy content-based, risk-aware, and community-led.
              </p>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="This month's revenue" value={formatCurrency(snapshot.thisMonthRevenue)} />
              <MetricCard label="Total subscribers" value={String(snapshot.totalSubscribers)} />
              <MetricCard label="Posts published" value={String(snapshot.postsPublished)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_20rem]">
              <div className="grid gap-6">
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Revenue model
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-ink">
                        Monthly membership revenue
                      </h2>
                    </div>
                    <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted">
                      70% analyst / 30% Chain Brief
                    </div>
                  </div>

                  <form className="mt-5 grid gap-4" action={saveAnalystDashboardSettingsAction}>
                    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <input
                        defaultChecked={snapshot.profile?.membership_enabled ?? false}
                        name="membership_enabled"
                        type="checkbox"
                      />
                      <div>
                        <p className="text-sm font-semibold text-ink">Enable membership</p>
                        <p className="text-xs leading-5 text-muted">
                          Turn this on when you are ready to accept paying members.
                        </p>
                      </div>
                    </label>

                    <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                          Monthly price
                        </span>
                        <input
                          className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                          defaultValue={snapshot.profile?.membership_price_usd ?? 1}
                          min={1}
                          max={50}
                          name="membership_price_usd"
                          step="1"
                          type="number"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                          Membership description
                        </span>
                        <textarea
                          className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                          defaultValue={snapshot.profile?.membership_description ?? ""}
                          name="membership_description"
                          placeholder="Describe what members receive."
                        />
                      </label>
                    </div>

                    <Button type="submit">Save membership settings</Button>
                  </form>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Monthly revenue
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-ink">
                        Last 6 months
                      </h2>
                    </div>
                    <Button href="/community/write" variant="secondary">
                      Write a post
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {snapshot.revenueBars.map((bar) => (
                      <div key={bar.label} className="grid grid-cols-[3.5rem_minmax(0,1fr)_4rem] items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                          {bar.label}
                        </span>
                        <div className="h-3 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${Math.max((bar.amount / maxRevenue) * 100, 6)}%` }}
                          />
                        </div>
                        <span className="text-right text-xs font-semibold text-ink">
                          {formatCurrency(bar.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <aside className="space-y-3">
                <Card className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Membership members
                  </p>
                  <div className="mt-3 grid gap-2">
                    {snapshot.memberships.length ? (
                      snapshot.memberships.map((membership) => (
                        <div
                          key={membership.id}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-ink">
                              {membership.subscriber_profile?.username || shortId(membership.subscriber_user_id)}
                            </p>
                            <Badge status={membership.status} />
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted">
                            Started {formatDate(membership.started_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-muted">No members yet.</p>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Analyst snapshot
                  </p>
                  <div className="mt-3 grid gap-2 text-sm">
                    <StatRow label="Membership status" value={snapshot.profile?.membership_enabled ? "Enabled" : "Disabled"} />
                    <StatRow
                      label="Monthly price"
                      value={formatCurrency(snapshot.profile?.membership_price_usd ?? 1)}
                    />
                    <StatRow
                      label="Description"
                      value={snapshot.profile?.membership_description || "Not set"}
                    />
                  </div>
                </Card>

                <Card className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Next steps
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Analyst revenue will later expand to premium posts, tips, and a platform reward
                    pool. Keep publishing risk-aware work.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button href="/community/write">Write now</Button>
                    <Button href="/analyst/status" variant="secondary">
                      Status
                    </Button>
                  </div>
                </Card>
              </aside>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
      {status}
    </span>
  );
}

function formatCurrency(value: number | string) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function shortId(value: string) {
  return `${value.slice(0, 8)}…`;
}
