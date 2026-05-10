"use client";

import { Header } from "@/components/header";
import { SettingsPanel } from "@/components/settings-panel";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import { useI18n } from "@/lib/i18n/use-i18n";

export default function SettingsPage() {
  const { t: copy } = useI18n();

  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <Container className="section-space">
        <SectionTitle
          eyebrow={copy.pages.settingsEyebrow}
          title={copy.pages.settingsTitle}
          description={copy.pages.settingsDescription}
        />
        <div className="mt-8">
          <SettingsPanel />
        </div>
      </Container>
    </main>
  );
}
