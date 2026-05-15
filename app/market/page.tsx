import type { Metadata } from "next";
import { Header } from "@/components/header";
import { CryptoHeatmap } from "@/components/crypto-heatmap";

export const metadata: Metadata = {
  title: "Market Data | Chain Brief",
  description:
    "Live Binance-powered crypto heatmap. See 24h price changes and trading volumes for all USDT pairs at a glance.",
};

export default function MarketPage() {
  return (
    <main className="site-grid min-h-screen overflow-hidden">
      <Header />
      <CryptoHeatmap />
    </main>
  );
}
