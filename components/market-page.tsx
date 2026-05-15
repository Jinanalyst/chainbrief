"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/container";
import { CryptoHeatmap } from "@/components/crypto-heatmap";
import { StockHeatmap } from "@/components/stock-heatmap";

type Tab = "stocks" | "crypto";

const TABS: { id: Tab; label: string; labelKo: string }[] = [
  { id: "stocks", label: "Stocks",  labelKo: "주식" },
  { id: "crypto", label: "Crypto",  labelKo: "크립토" },
];

export function MarketPage() {
  const [tab, setTab] = useState<Tab>("stocks");
  const [language, setLanguage] = useState<"en" | "ko">("en");

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("chainbrief-preferences") ?? "{}") as { language?: string };
      if (prefs.language === "ko") setLanguage("ko");
    } catch { /* ignore */ }
  }, []);

  return (
    <>
      {/* Tab switcher bar */}
      <div className="border-b border-white/10 bg-surface/60">
        <Container>
          <div className="flex gap-1 pt-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-t-md border-b-2 px-5 text-sm font-semibold transition",
                  tab === t.id
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
                onClick={() => setTab(t.id)}
                type="button"
              >
                {t.id === "stocks" ? (
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" x2="12.01" y1="17" y2="17" />
                  </svg>
                )}
                {language === "ko" ? t.labelKo : t.label}
              </button>
            ))}
          </div>
        </Container>
      </div>

      {tab === "stocks" ? <StockHeatmap /> : <CryptoHeatmap />}
    </>
  );
}
