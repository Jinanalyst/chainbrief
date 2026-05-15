"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type HeatmapVariant = "stock" | "crypto";
type HeatmapLanguage = "en" | "ko";

type TradingViewStockHeatmapProps = {
  className?: string;
  language?: HeatmapLanguage;
  variant?: HeatmapVariant;
  widgetClassName?: string;
};

const HEATMAP_CONFIG = {
  stock: {
    copyrightHref: "https://www.tradingview.com/heatmap/stock/",
    copyrightLabel: { en: "Stock Heatmap", ko: "\uC8FC\uC2DD \uD788\uD2B8\uB9F5" },
    scriptSrc:
      "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js",
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
    scriptSrc:
      "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js",
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
  HeatmapVariant,
  {
    copyrightHref: string;
    copyrightLabel: Record<HeatmapLanguage, string>;
    scriptSrc: string;
    settings: (height: number) => string;
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

function TradingViewStockHeatmapComponent({
  className,
  language = "en",
  variant = "stock",
  widgetClassName,
}: TradingViewStockHeatmapProps) {
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
    <Card className={cn("min-w-0 overflow-hidden bg-white p-0", className)}>
      <div
        className="tradingview-widget-container w-full"
        ref={containerRef}
        style={{ minHeight: widgetHeight + 28 }}
      >
        <div
          className={cn("tradingview-widget-container__widget w-full", widgetClassName)}
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
    </Card>
  );
}

export const TradingViewStockHeatmap = memo(TradingViewStockHeatmapComponent);
