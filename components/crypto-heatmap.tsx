"use client";

import { TradingViewHeatmap } from "@/components/tradingview-heatmap";

type CryptoHeatmapProps = {
  language?: "en" | "ko";
};

export function CryptoHeatmap({ language = "en" }: CryptoHeatmapProps) {
  return <TradingViewHeatmap language={language} variant="crypto" />;
}
