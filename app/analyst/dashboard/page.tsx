export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { AnalystDashboardView } from "@/components/analyst-dashboard-view";
import type { DashboardSnapshot } from "@/components/analyst-dashboard-view";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  getApprovedAnalystProfile,
  getCurrentUserContext,
  getAnalystDashboardSnapshot,
} from "@/lib/analyst-data";

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

  let user = null;
  try {
    const ctx = await getCurrentUserContext();
    user = ctx.user;
  } catch { /* Supabase unreachable */ }
  if (!user) redirect("/login?next=/analyst/dashboard");

  let approved = null;
  try {
    approved = await getApprovedAnalystProfile(user.id);
  } catch { /* table may not exist */ }
  if (!approved) redirect("/analyst/status");

  let snapshot: DashboardSnapshot;
  try {
    snapshot = await getAnalystDashboardSnapshot(user.id) as DashboardSnapshot;
  } catch {
    snapshot = {
      thisMonthRevenue: 0,
      totalSubscribers: 0,
      postsPublished: 0,
      revenueBars: [],
      memberships: [],
      profile: null,
      tronAddress: null,
    };
  }

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-tint/10 bg-background/72">
        <Container className="section-space">
          <Suspense>
            <AnalystDashboardView snapshot={snapshot} />
          </Suspense>
        </Container>
      </section>
    </main>
  );
}
