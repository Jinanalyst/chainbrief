"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { ANALYST_DISCLAIMER, ANALYST_NO_PROMISES, ANALYST_REVENUE_COPY, readAnalystApplicationByUserId, readAnalystPayouts, readAnalystRewards } from "@/lib/analyst-growth";

export default function AnalystPayoutsPage() {
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) {
        return;
      }

      setUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!hasSupabaseConfig) {
    return (
      <main className="site-grid min-h-screen overflow-hidden">
        <Header />
        <Container className="section-space">
          <Card className="p-6">
            <p className="text-lg font-semibold text-ink">Supabase is not configured.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
              to `.env.local`.
            </p>
          </Card>
        </Container>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="site-grid min-h-screen overflow-hidden">
        <Header />
        <Container className="section-space">
          <Card className="grid gap-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Analyst Payouts
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-ink">
                Log in to view payout information
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                This page shows reward structure and payout fields for analysts.
              </p>
            </div>
            <Button className="w-full sm:w-auto" href="/login">
              Log in
            </Button>
          </Card>
        </Container>
      </main>
    );
  }

  const application = readAnalystApplicationByUserId(user.id);
  const rewards = readAnalystRewards(user.id);
  const payouts = readAnalystPayouts(user.id);

  return (
    <main className="site-grid min-h-screen overflow-hidden pb-20">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Analyst Payouts
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              Reward overview and payout status
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              {ANALYST_REVENUE_COPY}
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard label="This month's estimated reward" value="0 USDT" />
                <StatCard label="Lifetime rewards" value="0 USDT" />
                <StatCard label="Reward score" value="74 / 100" />
              </div>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Reward Details
                </p>
                <div className="mt-4 grid gap-3">
                  {rewards.length > 0 ? (
                    rewards.map((reward) => (
                      <div key={reward.id} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-ink">{reward.period}</p>
                          <span className="text-xs font-semibold text-blue-100">
                            {reward.rewardAmountUsdt} USDT
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted">
                          <Line label="Reward source" value={reward.rewardSource} />
                          <Line label="Qualified views" value={String(reward.qualifiedViews)} />
                          <Line label="Read time score" value={String(reward.readTimeScore)} />
                          <Line label="Bookmark score" value={String(reward.bookmarkScore)} />
                          <Line label="Trust score" value={String(reward.trustScore)} />
                          <Line label="Total score" value={String(reward.totalScore)} />
                          <Line label="Status" value={reward.status} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted">
                      Rewards will appear after a Verified Analyst application is approved.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Payout Status
                </p>
                <div className="mt-4 grid gap-3">
                  {payouts.length > 0 ? (
                    payouts.map((payout) => (
                      <div key={payout.id} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-ink">{payout.period}</p>
                          <span className="text-xs font-semibold text-blue-100">{payout.amountUsdt} USDT</span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted">
                          <Line label="Payout wallet address" value={payout.walletAddress || "Not set"} />
                          <Line label="Payout status" value={payout.payoutStatus} />
                          <Line label="Payout tx hash" value={payout.txHash || "-"} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted">
                      No payout rows yet. Once approved, this section can reflect planned or
                      paid rewards.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Reward Model
                </p>
                <div className="mt-4 grid gap-2 text-sm text-muted">
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Analyst Reward Pool</div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Pro subscription revenue sharing</div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Premium research</div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Reader tips</div>
                  <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">Sponsored research</div>
                </div>
              </Card>
            </div>

            <aside className="space-y-3">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Profile Wallet
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Payout wallet address can be stored in the profile schema later. For now this
                  page reflects the analyst application record.
                </p>
                <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-2">Current application</p>
                  <p className="mt-2 text-sm text-ink">{application?.status ?? "none"}</p>
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Safety Note
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">{ANALYST_DISCLAIMER}</p>
                <p className="mt-3 text-sm leading-6 text-muted">{ANALYST_NO_PROMISES}</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Next Step
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  If your application is not approved yet, finish the Verified Analyst review
                  flow first.
                </p>
                <Button className="mt-4 w-full" href="/analyst/apply" variant="secondary">
                  Back to application
                </Button>
              </Card>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span>{label}</span>
      <span className="break-words text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
