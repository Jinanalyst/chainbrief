import { Header } from "@/components/header";
import { SettingsPanel } from "@/components/settings-panel";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";

export default function SettingsPage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <Container className="section-space">
        <SectionTitle
          eyebrow="Settings"
          title="Personalize your briefing feed."
          description="Choose default sources, categories, and keyword filters for the compact Chain Brief RSS feed."
        />
        <div className="mt-8">
          <SettingsPanel />
        </div>
      </Container>
    </main>
  );
}
