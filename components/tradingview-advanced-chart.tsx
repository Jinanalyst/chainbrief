"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/ui/container";

type TradingViewAdvancedChartProps = {
  language?: "en" | "ko";
};

const SCRIPT_SRC =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

function getWidgetHeight() {
  if (typeof window === "undefined") return 640;
  if (window.innerWidth < 640) return 480;
  if (window.innerWidth < 1024) return 580;
  return 720;
}

function buildSettings(_language: "en" | "ko", height: number) {
  return JSON.stringify({
    allow_symbol_change: true,
    calendar: false,
    details: true,
    hide_side_toolbar: false,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: true,
    interval: "D",
    locale: "en",
    save_image: true,
    style: "1",
    symbol: "INDEX:BTCUSD",
    theme: "light",
    timezone: "Etc/UTC",
    backgroundColor: "#ffffff",
    gridColor: "rgba(46, 46, 46, 0.06)",
    watchlist: [
      "BINANCE:ETHUSDT",
      "BINANCE:SOLUSDT",
      "BINANCE:DOGEUSDT",
      "BINANCE:BNBUSDT",
      "CRYPTOCAP:BTC.D",
      "CRYPTOCAP:TOTAL",
      "BINANCE:PEPEUSDT",
    ],
    withdateranges: true,
    range: "1D",
    compareSymbols: [],
    show_popup_button: true,
    popup_height: "650",
    popup_width: "1000",
    studies: [],
    autosize: true,
    width: "100%",
    height,
  });
}

function TradingViewAdvancedChartComponent({
  language = "en",
}: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [widgetHeight, setWidgetHeight] = useState(getWidgetHeight);
  const settings = useMemo(
    () => buildSettings(language, widgetHeight),
    [language, widgetHeight],
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
    if (!container || !widget) return;

    container.querySelectorAll("iframe, script").forEach((node) => node.remove());
    widget.replaceChildren();

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = settings;
    container.appendChild(script);

    return () => {
      container.querySelectorAll("iframe, script").forEach((node) => node.remove());
      widget.replaceChildren();
    };
  }, [settings]);

  const title = language === "ko" ? "어드밴스드 차트" : "Advanced Chart";
  const eyebrow = language === "ko" ? "차트" : "Chart";
  const summary =
    language === "ko"
      ? "심볼을 자유롭게 바꾸고, 이치모쿠 클라우드 포함 다양한 인디케이터로 분석해 보세요."
      : "Switch symbols freely and analyze with indicators including Ichimoku Cloud.";

  return (
    <section className="bg-background/72 py-6 sm:py-8 lg:py-10">
      <Container className="min-w-0">
        <div className="mb-5 flex min-w-0 flex-col gap-3 border-b border-tint/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </p>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{summary}</p>
          </div>
          <span className="w-fit rounded-full border border-tint/10 bg-tint/[0.03] px-3 py-1.5 text-xs font-semibold text-muted-2">
            TradingView
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-tint/10 bg-white shadow-soft">
          <div
            className="tradingview-widget-container w-full"
            ref={containerRef}
            style={{ height: widgetHeight + 32, width: "100%" }}
          >
            <div
              className="tradingview-widget-container__widget w-full"
              ref={widgetRef}
              style={{ height: `calc(100% - 32px)`, width: "100%" }}
            />
            <div className="tradingview-widget-copyright px-3 pb-2 text-center text-[0.68rem] text-slate-500">
              <a
                className="text-blue-600 transition hover:text-blue-700"
                href="https://www.tradingview.com/symbols/BTCUSD/?exchange=INDEX"
                rel="noopener nofollow"
                target="_blank"
              >
                <span className="blue-text">Bitcoin price</span>
              </a>
              <span className="trademark"> by TradingView</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export const TradingViewAdvancedChart = memo(TradingViewAdvancedChartComponent);
