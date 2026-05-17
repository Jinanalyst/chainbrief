import type { Metadata } from "next";
import { Header } from "@/components/header";
import { MarketPage } from "@/components/market-page";

export const metadata: Metadata = {
  title: "Market Data | Chain Brief",
  description:
    "Live stock and crypto heatmaps. Real-time price data for S&P 500, Nasdaq 100, Dow Jones, sectors, and all major crypto pairs.",
};

export default function MarketPageRoute() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <MarketPage />
    </main>
  );
}
