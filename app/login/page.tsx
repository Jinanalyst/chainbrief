import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <section className="border-t border-tint/10 bg-background/72">
        <Container className="flex min-h-[calc(100vh-5rem)] items-center justify-center py-12">
          <Card className="w-full max-w-md p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Account
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-ink">
              Log in with Google
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Chain Brief uses Supabase Auth with Google OAuth. Email login is
              available as a fallback while account features are being connected.
            </p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </Card>
        </Container>
      </section>
    </main>
  );
}
