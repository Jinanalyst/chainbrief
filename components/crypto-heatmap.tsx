"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/container";

type Coin = {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  quoteVolume: number;
};

type HeatmapData = {
  coins: Coin[];
  refreshedAt: string;
  error?: string;
};

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

const STABLE_PREFIXES = ["USDC", "BUSD", "DAI", "TUSD", "FDUSD", "USDP", "FRAX"];

function processTickers(tickers: BinanceTicker[]): Coin[] {
  return tickers
    .filter((t) => {
      if (!t.symbol.endsWith("USDT")) return false;
      const base = t.symbol.slice(0, -4);
      if (STABLE_PREFIXES.some((p) => base.startsWith(p))) return false;
      return true;
    })
    .map((t) => ({
      symbol: t.symbol.slice(0, -4),
      lastPrice: parseFloat(t.lastPrice),
      priceChangePercent: parseFloat(t.priceChangePercent),
      quoteVolume: parseFloat(t.quoteVolume),
    }))
    .filter((t) => t.quoteVolume > 50_000 && t.lastPrice > 0)
    .sort((a, b) => b.quoteVolume - a.quoteVolume);
}

type FilterType = "usdt" | "top-volume" | "gainers" | "losers" | "major";

const MAJOR_COINS = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "AVAX", "DOGE",
  "DOT", "LINK", "MATIC", "LTC", "UNI", "ATOM", "XLM", "TRX",
  "NEAR", "ICP", "APT", "ARB",
];

const FILTERS: { id: FilterType; label: string; labelKo: string }[] = [
  { id: "usdt", label: "All USDT", labelKo: "전체 USDT" },
  { id: "top-volume", label: "Top Volume", labelKo: "거래량 상위" },
  { id: "gainers", label: "Gainers", labelKo: "상승" },
  { id: "losers", label: "Losers", labelKo: "하락" },
  { id: "major", label: "Major", labelKo: "주요 코인" },
];

function applyFilter(coins: Coin[], filter: FilterType): Coin[] {
  switch (filter) {
    case "usdt":
      return coins.slice(0, 120);
    case "top-volume":
      return coins.slice(0, 50);
    case "gainers":
      return coins
        .filter((c) => c.priceChangePercent > 0)
        .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
        .slice(0, 60);
    case "losers":
      return coins
        .filter((c) => c.priceChangePercent < 0)
        .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
        .slice(0, 60);
    case "major":
      return coins
        .filter((c) => MAJOR_COINS.includes(c.symbol))
        .sort((a, b) => b.quoteVolume - a.quoteVolume);
  }
}

function getTileBackground(pct: number): string {
  const clamped = Math.min(Math.abs(pct), 12);
  const intensity = clamped / 12;
  const alpha = 0.18 + intensity * 0.68;
  if (pct >= 0) {
    return `rgba(37,198,133,${alpha.toFixed(2)})`;
  }
  return `rgba(255,94,108,${alpha.toFixed(2)})`;
}

function getTileBorder(pct: number): string {
  const clamped = Math.min(Math.abs(pct), 12);
  const intensity = clamped / 12;
  const alpha = 0.18 + intensity * 0.45;
  if (pct >= 0) {
    return `rgba(37,198,133,${alpha.toFixed(2)})`;
  }
  return `rgba(255,94,108,${alpha.toFixed(2)})`;
}

type SizeTier = { w: string; h: number; showPrice: boolean; showPct: boolean; fontSize: number };

function getSizeTier(volume: number, maxVolume: number): SizeTier {
  const ratio = volume / maxVolume;
  if (ratio > 0.35) return { w: "20%",   h: 108, showPrice: true,  showPct: true,  fontSize: 15 };
  if (ratio > 0.12) return { w: "14%",   h: 88,  showPrice: true,  showPct: true,  fontSize: 13 };
  if (ratio > 0.04) return { w: "10%",   h: 72,  showPrice: false, showPct: true,  fontSize: 11 };
  if (ratio > 0.012) return { w: "7.5%", h: 62,  showPrice: false, showPct: true,  fontSize: 10 };
  if (ratio > 0.003) return { w: "5.5%", h: 54,  showPrice: false, showPct: true,  fontSize: 9.5 };
  return                     { w: "4%",  h: 46,  showPrice: false, showPct: false, fontSize: 8.5 };
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100)   return price.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (price >= 1)     return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 0.01)  return price.toFixed(4);
  return price.toFixed(6);
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(0)}M`;
  return `$${(vol / 1e3).toFixed(0)}K`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function CryptoHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("usdt");
  const [language, setLanguage] = useState<"en" | "ko">("en");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("chainbrief-preferences");
    if (stored) {
      try {
        const prefs = JSON.parse(stored) as { language?: string };
        if (prefs.language === "ko") setLanguage("ko");
      } catch {
        // ignore
      }
    }
  }, []);

  async function fetchData() {
    // Try Binance directly from the browser first — avoids Vercel server IP blocks.
    // Binance public ticker API supports CORS.
    try {
      const res = await fetch("https://api.binance.com/api/v3/ticker/24hr", {
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`Binance ${res.status}`);
      const tickers: BinanceTicker[] = await res.json();
      setData({ coins: processTickers(tickers), refreshedAt: new Date().toISOString() });
      setLoading(false);
      return;
    } catch {
      // fall through to server-side proxy
    }

    // Fallback: server route (caches on Vercel edge, works if server IPs aren't blocked)
    try {
      const res = await fetch("/api/market/heatmap");
      if (!res.ok) throw new Error("proxy failed");
      const json: HeatmapData = await res.json();
      setData(json);
    } catch {
      setData({ coins: [], error: "Could not load market data.", refreshedAt: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const allCoins = data?.coins ?? [];
  const visible = applyFilter(allCoins, filter);
  const maxVolume = visible.length > 0 ? visible[0].quoteVolume : 1;

  const gainers = visible.filter((c) => c.priceChangePercent > 0).length;
  const losers  = visible.filter((c) => c.priceChangePercent < 0).length;
  const topGainer = visible.reduce<Coin | null>((best, c) =>
    !best || c.priceChangePercent > best.priceChangePercent ? c : best, null);
  const topLoser = visible.reduce<Coin | null>((best, c) =>
    !best || c.priceChangePercent < best.priceChangePercent ? c : best, null);

  return (
    <section className="section-space">
      <Container>
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">
              {language === "ko" ? "시장 데이터" : "Market Data"}
            </p>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">
              {language === "ko" ? "실시간 크립토 히트맵" : "Crypto Market Heatmap"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {language === "ko"
                ? "Binance 24시간 티커 기반 · USDT 페어 · 1분마다 자동 갱신"
                : "Binance 24hr ticker · USDT pairs · Auto-refreshes every minute"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {data && !loading && (
              <span className="text-xs text-muted-2">
                {language === "ko" ? "업데이트" : "Updated"} {formatTime(data.refreshedAt)}
              </span>
            )}
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-ink disabled:opacity-40"
              disabled={loading}
              onClick={() => { setLoading(true); fetchData(); }}
              type="button"
            >
              <span
                className={cn("inline-block h-1.5 w-1.5 rounded-full bg-accent", loading && "animate-pulse")}
              />
              {loading
                ? (language === "ko" ? "불러오는 중..." : "Loading...")
                : (language === "ko" ? "새로고침" : "Refresh")}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              className={cn(
                "h-8 rounded-md border px-3.5 text-xs font-semibold transition",
                filter === f.id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/30 hover:text-ink",
              )}
              key={f.id}
              onClick={() => setFilter(f.id)}
              type="button"
            >
              {language === "ko" ? f.labelKo : f.label}
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        {!loading && visible.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-2">
            <span>
              <span className="text-muted">{visible.length}</span>{" "}
              {language === "ko" ? "코인" : "coins"}
            </span>
            <span className="text-success">
              ▲ {gainers} {language === "ko" ? "상승" : "up"}
            </span>
            <span className="text-danger">
              ▼ {losers} {language === "ko" ? "하락" : "down"}
            </span>
            {topGainer && (
              <span>
                {language === "ko" ? "최고 상승" : "Top gainer"}{" "}
                <span className="font-semibold text-success">
                  {topGainer.symbol} +{topGainer.priceChangePercent.toFixed(2)}%
                </span>
              </span>
            )}
            {topLoser && (
              <span>
                {language === "ko" ? "최고 하락" : "Top loser"}{" "}
                <span className="font-semibold text-danger">
                  {topLoser.symbol} {topLoser.priceChangePercent.toFixed(2)}%
                </span>
              </span>
            )}
          </div>
        )}

        {/* Heatmap */}
        <div
          className="overflow-hidden rounded-xl border border-white/[0.07] bg-surface"
          style={{ minHeight: 300 }}
        >
          {loading && (
            <div className="flex h-72 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <span className="text-sm text-muted">
                  {language === "ko" ? "시장 데이터 불러오는 중..." : "Loading market data..."}
                </span>
              </div>
            </div>
          )}

          {!loading && data?.error && (
            <div className="flex h-72 items-center justify-center text-sm text-muted">
              {data.error}
            </div>
          )}

          {!loading && !data?.error && visible.length === 0 && (
            <div className="flex h-72 items-center justify-center text-sm text-muted">
              {language === "ko" ? "표시할 코인이 없습니다." : "No coins to display."}
            </div>
          )}

          {!loading && !data?.error && visible.length > 0 && (
            <div className="flex flex-wrap p-0.5">
              {visible.map((coin) => {
                const size = getSizeTier(coin.quoteVolume, maxVolume);
                const bg     = getTileBackground(coin.priceChangePercent);
                const border = getTileBorder(coin.priceChangePercent);
                const pctStr = (coin.priceChangePercent >= 0 ? "+" : "") +
                  coin.priceChangePercent.toFixed(2) + "%";

                return (
                  <div
                    key={coin.symbol}
                    className="group relative flex-shrink-0 cursor-default overflow-hidden p-0.5"
                    style={{ width: size.w }}
                    title={`${coin.symbol}/USDT · ${pctStr} · ${formatVolume(coin.quoteVolume)} vol`}
                  >
                    <div
                      className="flex h-full w-full flex-col items-center justify-center rounded transition-opacity duration-150 group-hover:opacity-80"
                      style={{
                        height: size.h,
                        background: bg,
                        border: `1px solid ${border}`,
                      }}
                    >
                      <span
                        className="truncate font-bold leading-tight text-ink"
                        style={{ fontSize: size.fontSize }}
                      >
                        {coin.symbol}
                      </span>

                      {size.showPct && (
                        <span
                          className={cn(
                            "mt-0.5 font-semibold leading-none",
                            coin.priceChangePercent >= 0 ? "text-success" : "text-danger",
                          )}
                          style={{ fontSize: size.fontSize - 1 }}
                        >
                          {pctStr}
                        </span>
                      )}

                      {size.showPrice && (
                        <span
                          className="mt-0.5 font-medium leading-none text-ink/70"
                          style={{ fontSize: size.fontSize - 2 }}
                        >
                          ${formatPrice(coin.lastPrice)}
                        </span>
                      )}
                    </div>

                    {/* Tooltip on hover — volume */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-full left-1/2 z-10 mb-1.5 hidden w-max -translate-x-1/2 rounded-md border border-white/10 bg-surface-3 px-2 py-1 text-[10px] leading-snug text-ink shadow-soft group-hover:block">
                      <span className="font-bold">{coin.symbol}/USDT</span>
                      <br />
                      <span className="text-muted-2">Vol</span> {formatVolume(coin.quoteVolume)}
                      <br />
                      <span className="text-muted-2">Price</span> ${formatPrice(coin.lastPrice)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        {!loading && visible.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-2">
            <span>{language === "ko" ? "색상" : "Color"}:</span>
            {[
              { bg: "rgba(37,198,133,0.85)", label: ">+5%" },
              { bg: "rgba(37,198,133,0.50)", label: "+0%" },
              { bg: "rgba(255,94,108,0.50)", label: "-0%" },
              { bg: "rgba(255,94,108,0.85)", label: "<-5%" },
            ].map((item) => (
              <span className="flex items-center gap-1" key={item.label}>
                <span
                  className="inline-block h-3 w-4 rounded-sm"
                  style={{ background: item.bg }}
                />
                {item.label}
              </span>
            ))}
            <span className="ml-2">{language === "ko" ? "크기 = 거래량" : "Size = Volume"}</span>
          </div>
        )}
      </Container>
    </section>
  );
}
