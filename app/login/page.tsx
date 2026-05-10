import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

export default function LoginPage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="flex min-h-[calc(100vh-5rem)] items-center justify-center py-12">
          <Card className="w-full max-w-md p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Account
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-ink">Log in</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Supabase authentication will be connected here. For now, Chain Brief
              keeps preferences in this browser.
            </p>
            <Button className="mt-6 w-full" href="/briefs" variant="secondary">
              Back to briefs
            </Button>
          </Card>
        </Container>
      </section>
    </main>
  );
}
