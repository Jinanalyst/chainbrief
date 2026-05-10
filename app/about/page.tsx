import { BrandLogo } from "@/components/brand-logo";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";

export default function AboutPage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <Container className="section-space">
        <div className="mb-8">
          <BrandLogo full />
        </div>
        <SectionTitle
          eyebrow="About"
          title="A fast crypto RSS briefing feed."
          description="Chain Brief organizes public RSS headlines into a compact briefing interface with source, category, and keyword controls."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["RSS first", "Brief Korean summaries", "Personal filters"].map((item) => (
            <Card className="p-5" key={item}>
              <Badge tone="accent">{item}</Badge>
              <p className="mt-4 text-sm leading-6 text-muted">
                Built around quick scanning, timestamps, source labels, and original
                article links.
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
