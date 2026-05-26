import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Container } from "@/components/ui/container";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { isInsightAuthor, type Insight } from "@/lib/insights";
import { StudioEditor } from "@/components/insights/studio-editor";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function StudioEditorPage({ params }: { params: Params }) {
  const { id } = await params;

  if (!hasSupabaseConfig) {
    redirect("/login?next=/insights/studio");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/insights/studio/${id}`);
  }
  if (!isInsightAuthor(user.email)) {
    redirect("/insights/studio");
  }

  const { data } = await supabase
    .from("cb_insights")
    .select("*")
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <main className="site-grid min-h-screen">
      <Header />
      <Container className="py-8">
        <StudioEditor initialInsight={data as Insight} />
      </Container>
    </main>
  );
}
