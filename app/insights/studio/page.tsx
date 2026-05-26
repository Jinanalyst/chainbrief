import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Container } from "@/components/ui/container";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { isInsightAuthor, type Insight } from "@/lib/insights";
import { StudioDashboard } from "@/components/insights/studio-dashboard";
import { NotAuthorisedNotice } from "@/components/insights/not-authorised-notice";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  if (!hasSupabaseConfig) {
    redirect("/login?next=/insights/studio");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/insights/studio");
  }
  if (!isInsightAuthor(user.email)) {
    return (
      <main className="site-grid min-h-screen">
        <Header />
        <Container className="py-16">
          <NotAuthorisedNotice email={user.email ?? ""} />
        </Container>
      </main>
    );
  }

  const { data } = await supabase
    .from("cb_insights")
    .select("*")
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <main className="site-grid min-h-screen">
      <Header />
      <Container className="py-10">
        <StudioDashboard initialInsights={(data ?? []) as Insight[]} />
      </Container>
    </main>
  );
}
