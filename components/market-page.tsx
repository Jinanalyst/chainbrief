"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/container";
import { CryptoHeatmap } from "@/components/crypto-heatmap";
import { StockHeatmap } from "@/components/stock-heatmap";
import { TradingViewAdvancedChart } from "@/components/tradingview-advanced-chart";
import { usePreferences } from "@/lib/i18n/use-i18n";

type Tab = "stocks" | "crypto" | "chart";

const TABS: { id: Tab; label: string; labelKo: string }[] = [
  { id: "stocks", label: "Stocks", labelKo: "\uC8FC\uC2DD" },
  { id: "crypto", label: "Crypto", labelKo: "\uD06C\uB9BD\uD1A0" },
  { id: "chart", label: "Chart", labelKo: "\uCC28\uD2B8" },
];

export function MarketPage() {
  const [tab, setTab] = useState<Tab>("stocks");
  const [preferences] = usePreferences();
  const language = preferences.language;

  return (
    <>
      <div className="border-b border-tint/10 bg-surface/60">
        <Container>
          <div className="flex gap-1 pt-4">
            {TABS.map((item) => (
              <button
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-t-md border-b-2 px-5 text-sm font-semibold transition",
                  tab === item.id
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
                key={item.id}
                onClick={() => setTab(item.id)}
                type="button"
              >
                {item.id === "stocks" ? (
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    viewBox="0 0 24 24"
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                ) : item.id === "crypto" ? (
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" x2="12.01" y1="17" y2="17" />
                  </svg>
                ) : (
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M7 15l4-4 3 3 5-6" />
                  </svg>
                )}
                {language === "ko" ? item.labelKo : item.label}
              </button>
            ))}
          </div>
        </Container>
      </div>

      {tab === "stocks" ? (
        <StockHeatmap language={language} />
      ) : tab === "crypto" ? (
        <CryptoHeatmap key="crypto" language={language} />
      ) : (
        <TradingViewAdvancedChart key="chart" language={language} />
      )}
    </>
  );
}
