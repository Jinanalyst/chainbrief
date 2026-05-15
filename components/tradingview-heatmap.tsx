"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/ui/container";

export type TradingViewHeatmapVariant = "stock" | "crypto";

type TradingViewHeatmapProps = {
  language?: "en" | "ko";
  variant: TradingViewHeatmapVariant;
};

const HEATMAP_CONFIG = {
  stock: {
    copyrightHref: "https://www.tradingview.com/heatmap/stock/",
    copyrightLabel: { en: "Stock Heatmap", ko: "\uC8FC\uC2DD \uD788\uD2B8\uB9F5" },
    eyebrow: { en: "Equities", ko: "\uC8FC\uC2DD" },
    scriptSrc:
      "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js",
    summary: {
      en: "S&P 500 market map by sector, sized by market cap and colored by price change.",
      ko: "S&P 500 \uC885\uBAA9\uC744 \uC139\uD130\uBCC4\uB85C \uBB36\uACE0, \uC2DC\uAC00\uCD1D\uC561 \uD06C\uAE30\uC640 \uAC00\uACA9 \uBCC0\uB3D9 \uC0C9\uC0C1\uC73C\uB85C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
    },
    title: { en: "Stock Market Heatmap", ko: "\uC8FC\uC2DD \uD788\uD2B8\uB9F5" },
    settings: (height: number) => `
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
        "height": ${height}
      }`,
  },
  crypto: {
    copyrightHref: "https://www.tradingview.com/heatmap/crypto/",
    copyrightLabel: { en: "Crypto Heatmap", ko: "\uD06C\uB9BD\uD1A0 \uD788\uD2B8\uB9F5" },
    eyebrow: { en: "Crypto", ko: "\uD06C\uB9BD\uD1A0" },
    scriptSrc:
      "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js",
    summary: {
      en: "Crypto coins by market cap, colored by 24-hour price change.",
      ko: "\uD06C\uB9BD\uD1A0 \uC790\uC0B0\uC744 \uC2DC\uAC00\uCD1D\uC561 \uD06C\uAE30\uC640 24\uC2DC\uAC04 \uAC00\uACA9 \uBCC0\uB3D9 \uC0C9\uC0C1\uC73C\uB85C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
    },
    title: { en: "Crypto Market Heatmap", ko: "\uD06C\uB9BD\uD1A0 \uD788\uD2B8\uB9F5" },
    settings: (height: number) => `
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
        "height": ${height}
      }`,
  },
} satisfies Record<
  TradingViewHeatmapVariant,
  {
    copyrightHref: string;
    copyrightLabel: Record<"en" | "ko", string>;
    eyebrow: Record<"en" | "ko", string>;
    scriptSrc: string;
    settings: (height: number) => string;
    summary: Record<"en" | "ko", string>;
    title: Record<"en" | "ko", string>;
  }
>;

function getWidgetHeight() {
  if (typeof window === "undefined") {
    return 640;
  }

  if (window.innerWidth < 640) {
    return 460;
  }

  if (window.innerWidth < 1024) {
    return 560;
  }

  return 680;
}

function TradingViewHeatmapComponent({
  language = "en",
  variant,
}: TradingViewHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const config = HEATMAP_CONFIG[variant];
  const [widgetHeight, setWidgetHeight] = useState(getWidgetHeight);
  const settings = useMemo(
    () => config.settings(widgetHeight),
    [config, widgetHeight],
  );

  useEffect(() => {
    function syncHeight() {
      setWidgetHeight(getWidgetHeight());
    }

    syncHeight();
    window.addEventListener("resize", syncHeight);

    return () => window.removeEventListener("resize", syncHeight);
  }, []);

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
    script.innerHTML = settings;
    container.appendChild(script);

    return () => {
      container.querySelectorAll("iframe, script").forEach((node) => node.remove());
      widget.replaceChildren();
    };
  }, [config.scriptSrc, settings]);

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

        <div className="overflow-hidden rounded-lg border border-white/10 bg-white shadow-soft">
          <div
            className="tradingview-widget-container w-full"
            ref={containerRef}
            style={{ minHeight: widgetHeight + 28 }}
          >
            <div
              className="tradingview-widget-container__widget w-full"
              ref={widgetRef}
              style={{ height: widgetHeight }}
            />
            <div className="tradingview-widget-copyright px-3 pb-2 text-center text-[0.68rem] text-slate-500">
              <a
                className="text-blue-600 transition hover:text-blue-700"
                href={config.copyrightHref}
                rel="noopener nofollow"
                target="_blank"
              >
                <span className="blue-text">{config.copyrightLabel[language]}</span>
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
