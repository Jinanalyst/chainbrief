import { Header } from "@/components/header";
import { ProfileSection } from "@/components/profile-section";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";

export default function ProfilePage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="section-space">
          <SectionTitle
            eyebrow="Profile"
            title="Create your Chain Brief identity."
            description="Set up the profile that follows you into community discussions, saved brief workflows, and future account features."
          />
          <div className="mt-8">
            <ProfileSection />
          </div>
        </Container>
      </section>
    </main>
  );
}
