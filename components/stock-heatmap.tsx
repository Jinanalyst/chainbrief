"use client";

import { TradingViewHeatmap } from "@/components/tradingview-heatmap";

type StockHeatmapProps = {
  language?: "en" | "ko";
};

export function StockHeatmap({ language = "en" }: StockHeatmapProps) {
  return <TradingViewHeatmap language={language} variant="stock" />;
}
