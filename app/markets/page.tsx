import { Header } from "@/components/header";
import { MarketsHeatmapSection } from "@/components/markets-heatmap-section";
import { Container } from "@/components/ui/container";

export default function MarketsPage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <section className="border-t border-white/10 bg-background/72">
        <Container className="min-w-0 pb-10 pt-5 sm:pb-12 lg:pb-16">
          <MarketsHeatmapSection />
        </Container>
      </section>
    </main>
  );
}
