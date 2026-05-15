"use client";

import { memo, useEffect, useRef } from "react";
import { Container } from "@/components/ui/container";

export type TradingViewHeatmapVariant = "stock" | "crypto";

type TradingViewHeatmapProps = {
  language?: "en" | "ko";
  variant: TradingViewHeatmapVariant;
};

const HEATMAP_CONFIG = {
  stock: {
    copyrightHref: "https://www.tradingview.com/heatmap/stock/",
    copyrightLabel: "Stock Heatmap",
    eyebrow: { en: "Equities", ko: "\uC8FC\uC2DD" },
    scriptSrc:
      "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js",
    summary: {
      en: "S&P 500 market map by sector, sized by market cap and colored by price change.",
      ko: "S&P 500 \uC885\uBAA9\uC744 \uC139\uD130\uBCC4\uB85C \uBB36\uACE0, \uC2DC\uAC00\uCD1D\uC561 \uD06C\uAE30\uC640 \uAC00\uACA9 \uBCC0\uB3D9 \uC0C9\uC0C1\uC73C\uB85C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
    },
    title: { en: "Stock Market Heatmap", ko: "\uC8FC\uC2DD \uD788\uD2B8\uB9F5" },
    settings: `
      {
        "dataSource": "SPX500",
        "blockSize": "market_cap_basic",
        "blockColor": "change",
        "grouping": "sector",
        "locale": "en",
        "symbolUrl": "",
        "colorTheme": "light",
        "exchanges": [],
        "hasTopBar": false,
        "isDataSetEnabled": false,
        "isZoomEnabled": true,
        "hasSymbolTooltip": true,
        "isMonoSize": false,
        "width": "100%",
        "height": "100%"
      }`,
  },
  crypto: {
    copyrightHref: "https://www.tradingview.com/heatmap/crypto/",
    copyrightLabel: "Crypto Heatmap",
    eyebrow: { en: "Crypto", ko: "\uD06C\uB9BD\uD1A0" },
    scriptSrc:
      "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js",
    summary: {
      en: "Crypto coins by market cap, colored by 24-hour price change.",
      ko: "\uD06C\uB9BD\uD1A0 \uC790\uC0B0\uC744 \uC2DC\uAC00\uCD1D\uC561 \uD06C\uAE30\uC640 24\uC2DC\uAC04 \uAC00\uACA9 \uBCC0\uB3D9 \uC0C9\uC0C1\uC73C\uB85C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
    },
    title: { en: "Crypto Market Heatmap", ko: "\uD06C\uB9BD\uD1A0 \uD788\uD2B8\uB9F5" },
    settings: `
      {
        "dataSource": "Crypto",
        "blockSize": "market_cap_calc",
        "blockColor": "24h_close_change|5",
        "locale": "en",
        "symbolUrl": "",
        "colorTheme": "light",
        "hasTopBar": false,
        "isDataSetEnabled": false,
        "isZoomEnabled": true,
        "hasSymbolTooltip": true,
        "isMonoSize": false,
        "width": "100%",
        "height": "100%"
      }`,
  },
} satisfies Record<
  TradingViewHeatmapVariant,
  {
    copyrightHref: string;
    copyrightLabel: string;
    eyebrow: Record<"en" | "ko", string>;
    scriptSrc: string;
    settings: string;
    summary: Record<"en" | "ko", string>;
    title: Record<"en" | "ko", string>;
  }
>;

function TradingViewHeatmapComponent({
  language = "en",
  variant,
}: TradingViewHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const config = HEATMAP_CONFIG[variant];

  useEffect(() => {
    const container = containerRef.current;
    const widget = widgetRef.current;

    if (!container || !widget) {
      return;
    }

    container.querySelectorAll("iframe, script").forEach((node) => node.remove());
    widget.replaceChildren();

    const script = document.createElement("script");
    script.src = config.scriptSrc;
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = config.settings;
    container.appendChild(script);

    return () => {
      container.querySelectorAll("iframe, script").forEach((node) => node.remove());
      widget.replaceChildren();
    };
  }, [config.scriptSrc, config.settings]);

  return (
    <section className="bg-background/72 py-6 sm:py-8 lg:py-10">
      <Container className="min-w-0">
        <div className="mb-5 flex min-w-0 flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {config.eyebrow[language]}
            </p>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {config.title[language]}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {config.summary[language]}
            </p>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-muted-2">
            TradingView
          </span>
        </div>

        <div className="min-h-[660px] overflow-hidden rounded-lg border border-white/10 bg-white shadow-soft">
          <div
            className="tradingview-widget-container flex h-[72vh] min-h-[660px] w-full flex-col"
            ref={containerRef}
          >
            <div
              className="tradingview-widget-container__widget min-h-[620px] flex-1"
              ref={widgetRef}
            />
            <div className="tradingview-widget-copyright px-3 pb-2 text-[0.68rem] text-slate-500">
              <a
                className="text-blue-600 transition hover:text-blue-700"
                href={config.copyrightHref}
                rel="noopener nofollow"
                target="_blank"
              >
                <span className="blue-text">{config.copyrightLabel}</span>
              </a>
              <span className="trademark"> by TradingView</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export const TradingViewHeatmap = memo(TradingViewHeatmapComponent);
