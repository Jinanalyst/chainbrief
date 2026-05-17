export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { AnalystRejectModal } from "@/components/analyst-reject-modal";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  approveAnalystApplicationAction,
} from "@/lib/analyst-actions";
import {
  getCurrentUserContext,
  listAnalystApplicationsForAdmin,
} from "@/lib/analyst-data";

export default async function AdminAnalystApplicationsPage() {
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

  const { profile } = await getCurrentUserContext();
  if (profile?.role !== "admin") {
    redirect("/analyst/apply");
  }

  const applications = await listAnalystApplicationsForAdmin();

  return (
    <main className="site-grid min-h-screen overflow-x-hidden pb-24">
      <Header />
      <section className="border-t border-tint/10 bg-background/72">
        <Container className="section-space">
          <div className="mx-auto grid max-w-7xl gap-6">
            <Card className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Admin panel
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Analyst applications
              </h1>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-[960px] w-full border-collapse text-left text-sm">
                  <thead className="border-b border-tint/10 bg-tint/[0.03] text-xs uppercase tracking-[0.16em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Expertise</th>
                      <th className="px-4 py-3">Sample</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((application) => (
                      <tr className="border-b border-tint/10 last:border-0" key={application.id}>
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-ink">{application.full_name}</p>
                          <p className="mt-1 text-xs text-muted">{application.twitter_handle || "No handle"}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-muted">
                          {formatDate(application.applied_at)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {application.expertise_areas.map((item) => (
                              <Badge key={item}>{item}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Link
                            className="break-words text-sm font-semibold text-accent-ink underline-offset-4 hover:underline"
                            href={application.sample_link}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View sample
                          </Link>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge>{application.status}</Badge>
                          {application.rejection_reason ? (
                            <p className="mt-2 max-w-sm text-xs leading-5 text-muted">
                              {application.rejection_reason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <form action={approveAnalystApplicationAction}>
                              <input name="application_id" type="hidden" value={application.id} />
                              <Button type="submit">Approve</Button>
                            </form>
                            <AnalystRejectModal applicationId={application.id} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </Container>
      </section>
    </main>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-tint/10 bg-tint/[0.03] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
      {children}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}
