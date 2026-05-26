import { Header } from "@/components/header";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Container } from "@/components/ui/container";

export const metadata = {
  title: "Welcome to Chain Brief",
  description: "Set up your analyst profile in a few quick steps.",
};

export default function OnboardingPage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <section className="relative border-t border-tint/10">
        {/* Soft ambient gradient — keeps the wizard from feeling boxy */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(47,123,255,0.12) 0%, rgba(47,123,255,0) 70%), radial-gradient(40% 35% at 80% 100%, rgba(120,90,255,0.10) 0%, rgba(120,90,255,0) 70%)",
          }}
        />
        <Container className="py-14 sm:py-20">
          <OnboardingWizard />
        </Container>
      </section>
    </main>
  );
}
