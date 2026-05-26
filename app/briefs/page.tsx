import type { Metadata } from "next";
import { Header } from "@/components/header";
import { HomepageFeed } from "@/components/homepage-feed";

export const metadata: Metadata = {
  title: "Briefs — Crypto, Stocks & Macro News",
  description:
    "Real-time market briefs across crypto, stocks, and macro. One connected financial feed updated continuously throughout the trading day.",
  alternates: { canonical: "/briefs" },
  openGraph: {
    title: "Chain Brief — Market Briefs",
    description:
      "Real-time market briefs across crypto, stocks, and macro from a single connected feed.",
    url: "/briefs",
    type: "website",
  },
};

export default function BriefsPage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <HomepageFeed showIntro />
    </main>
  );
}
