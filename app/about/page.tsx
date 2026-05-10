"use client";

import { BrandLogo } from "@/components/brand-logo";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import { useI18n } from "@/lib/i18n/use-i18n";

export default function AboutPage() {
  const { t: copy } = useI18n();

  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <Container className="section-space">
        <div className="mb-8">
          <BrandLogo full />
        </div>
        <SectionTitle
          eyebrow={copy.pages.aboutEyebrow}
          title={copy.pages.aboutTitle}
          description={copy.pages.aboutDescription}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {copy.pages.aboutFeatures.map((item) => (
            <Card className="p-5" key={item}>
              <Badge tone="accent">{item}</Badge>
              <p className="mt-4 text-sm leading-6 text-muted">
                {copy.pages.aboutFeatureText}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
