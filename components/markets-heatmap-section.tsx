"use client";

import { useState } from "react";
import { TradingViewStockHeatmap } from "@/components/tradingview-stock-heatmap";
import { cn } from "@/lib/cn";
import { usePreferences } from "@/lib/i18n/use-i18n";

type HeatmapMode = "stock" | "crypto";
type MarketsLanguage = "en" | "ko";

const HEATMAP_MODES: Array<{
  description: Record<MarketsLanguage, string>;
  label: Record<MarketsLanguage, string>;
  title: Record<MarketsLanguage, string>;
  value: HeatmapMode;
}> = [
  {
    description: {
      en: "S&P 500 by sector, sized by market cap and colored by price change.",
      ko: "S&P 500 \uC885\uBAA9\uC744 \uC139\uD130\uBCC4\uB85C \uBB36\uACE0, \uC2DC\uAC00\uCD1D\uC561 \uD06C\uAE30\uC640 \uAC00\uACA9 \uBCC0\uB3D9 \uC0C9\uC0C1\uC73C\uB85C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
    },
    label: { en: "Stocks", ko: "\uC8FC\uC2DD" },
    title: { en: "Stocks Heatmap", ko: "\uC8FC\uC2DD \uD788\uD2B8\uB9F5" },
    value: "stock",
  },
  {
    description: {
      en: "Crypto coins by market cap, colored by 24-hour price change.",
      ko: "\uD06C\uB9BD\uD1A0 \uC790\uC0B0\uC744 \uC2DC\uAC00\uCD1D\uC561 \uD06C\uAE30\uC640 24\uC2DC\uAC04 \uAC00\uACA9 \uBCC0\uB3D9 \uC0C9\uC0C1\uC73C\uB85C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
    },
    label: { en: "Crypto", ko: "\uD06C\uB9BD\uD1A0" },
    title: { en: "Crypto Heatmap", ko: "\uD06C\uB9BD\uD1A0 \uD788\uD2B8\uB9F5" },
    value: "crypto",
  },
];

const SECTION_LABEL: Record<MarketsLanguage, string> = {
  en: "Markets",
  ko: "\uB9C8\uCF13",
};

export function MarketsHeatmapSection() {
  const [mode, setMode] = useState<HeatmapMode>("stock");
  const [preferences] = usePreferences();
  const language = preferences.language;
  const activeMode =
    HEATMAP_MODES.find((item) => item.value === mode) ?? HEATMAP_MODES[0];

  return (
    <section className="min-w-0">
      <div className="mb-5 grid min-w-0 gap-4 border-b border-white/10 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,25rem)] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {SECTION_LABEL[language]}
          </p>
          <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {activeMode.title[language]}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {activeMode.description[language]}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 rounded-md border border-white/10 bg-white/[0.03] p-1">
          {HEATMAP_MODES.map((item) => (
            <button
              aria-pressed={mode === item.value}
              className={cn(
                "min-h-10 rounded px-3 text-xs font-bold transition sm:text-sm",
                mode === item.value
                  ? "bg-accent text-white"
                  : "text-muted hover:text-ink",
              )}
              key={item.value}
              onClick={() => setMode(item.value)}
              type="button"
            >
              {item.label[language]}
            </button>
          ))}
        </div>
      </div>

      <TradingViewStockHeatmap key={mode} language={language} variant={mode} />
    </section>
  );
}
