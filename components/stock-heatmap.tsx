"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/container";
import {
  FILTER_CONFIG,
  SECTOR_ORDER,
  type StockFilter,
  type StockSector,
} from "@/lib/market/stock-symbols";
import type { StockQuote } from "@/app/api/market/stocks/route";
import type { StockNewsItem } from "@/app/api/market/stocks/news/route";

// ── Types ────────────────────────────────────────────────────────────────────

type StockData = {
  stocks: StockQuote[];
  refreshedAt: string;
  error?: string;
  needsApiKey?: boolean;
};

type BullBearVotes = Record<string, "bull" | "bear" | null>;

// ── Color helpers ────────────────────────────────────────────────────────────

function getTileBg(pct: number): string {
  const intensity = Math.min(Math.abs(pct), 8) / 8;
  const alpha = 0.15 + intensity * 0.72;
  return pct >= 0
    ? `rgba(37,198,133,${alpha.toFixed(2)})`
    : `rgba(255,94,108,${alpha.toFixed(2)})`;
}

function getTileBorder(pct: number): string {
  const intensity = Math.min(Math.abs(pct), 8) / 8;
  const alpha = 0.15 + intensity * 0.45;
  return pct >= 0
    ? `rgba(37,198,133,${alpha.toFixed(2)})`
    : `rgba(255,94,108,${alpha.toFixed(2)})`;
}

function pctColor(pct: number) {
  return pct >= 0 ? "text-success" : "text-danger";
}

function pctStr(pct: number) {
  return (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
}

// ── Tile sizing (market-cap relative within a group) ─────────────────────────

type TileConfig = {
  colSpan: number;
  rowSpan: number;
  showName: boolean;
  showPrice: boolean;
  fontSize: number;
};

function getTileConfig(cap: number, maxCap: number): TileConfig {
  const r = maxCap > 0 ? cap / maxCap : 0;
  if (r > 0.55) return { colSpan: 6, rowSpan: 2, showName: true,  showPrice: true,  fontSize: 15 };
  if (r > 0.30) return { colSpan: 5, rowSpan: 2, showName: true,  showPrice: true,  fontSize: 14 };
  if (r > 0.15) return { colSpan: 4, rowSpan: 2, showName: true,  showPrice: true,  fontSize: 13 };
  if (r > 0.07) return { colSpan: 3, rowSpan: 1, showName: true,  showPrice: false, fontSize: 12 };
  if (r > 0.02) return { colSpan: 2, rowSpan: 1, showName: false, showPrice: false, fontSize: 11 };
  return              { colSpan: 1, rowSpan: 1, showName: false, showPrice: false, fontSize: 9.5 };
}

// ── Price / cap formatting ────────────────────────────────────────────────────

function fmtPrice(p: number): string {
  if (p >= 10000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 100)   return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return p.toFixed(2);
}

function fmtCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toLocaleString()}`;
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return `${(v / 1e3).toFixed(0)}K`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1)  return `${h}h ago`;
  if (m >= 1)  return `${m}m ago`;
  return "just now";
}

// ── NYSE market status ────────────────────────────────────────────────────────

function getMarketStatus(): { open: boolean; label: string } {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  const h = et.getHours();
  const m = et.getMinutes();
  const minutes = h * 60 + m;
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && minutes >= 570 && minutes < 960; // 9:30–16:00
  const isPreMarket = isWeekday && minutes >= 240 && minutes < 570;
  const isAfterHours = isWeekday && minutes >= 960 && minutes < 1200;
  if (isOpen) return { open: true, label: "NYSE Open" };
  if (isPreMarket) return { open: false, label: "Pre-Market" };
  if (isAfterHours) return { open: false, label: "After Hours" };
  return { open: false, label: "Market Closed" };
}

// ── Bull/Bear localStorage ────────────────────────────────────────────────────

const VOTES_KEY = "chainbrief-stock-votes";

function readVotes(): BullBearVotes {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) ?? "{}") as BullBearVotes;
  } catch {
    return {};
  }
}

function saveVote(symbol: string, side: "bull" | "bear" | null) {
  const votes = readVotes();
  votes[symbol] = side;
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
}

// ── Stock Detail Modal ────────────────────────────────────────────────────────

function StockModal({
  stock,
  vote,
  onVote,
  onClose,
  language,
}: {
  stock: StockQuote;
  vote: "bull" | "bear" | null;
  onVote: (side: "bull" | "bear" | null) => void;
  onClose: () => void;
  language: "en" | "ko";
}) {
  const [news, setNews] = useState<StockNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadNews() {
      try {
        const res = await fetch(`/api/market/stocks/news?symbol=${stock.symbol}`);
        if (!res.ok) throw new Error("news fetch failed");
        const data = (await res.json()) as { news: StockNewsItem[] };
        if (mounted) setNews(data.news ?? []);
      } catch {
        // silently fail — news not critical
      } finally {
        if (mounted) setNewsLoading(false);
      }
    }
    void loadNews();
    return () => { mounted = false; };
  }, [stock.symbol]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isPositive = stock.changePercent >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-surface shadow-[0_40px_120px_rgba(0,0,0,0.6)] sm:rounded-xl">
        {/* Header */}
        <div
          className="border-b border-white/10 px-5 py-4"
          style={{ background: getTileBg(stock.changePercent) }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-ink">
                  {stock.symbol}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs font-semibold",
                    isPositive
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-danger/30 bg-danger/10 text-danger",
                  )}
                >
                  {pctStr(stock.changePercent)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">{stock.name} · {stock.sector}</p>
            </div>
            <button
              className="shrink-0 rounded-md border border-white/10 p-1.5 text-muted transition hover:text-ink"
              onClick={onClose}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span>
              <span className="text-muted-2 text-xs">{language === "ko" ? "현재가" : "Price"} </span>
              <span className="font-bold text-ink">${fmtPrice(stock.price)}</span>
            </span>
            <span>
              <span className="text-muted-2 text-xs">{language === "ko" ? "변동" : "Change"} </span>
              <span className={cn("font-semibold", pctColor(stock.changePercent))}>
                {stock.change >= 0 ? "+" : ""}{fmtPrice(stock.change)}
              </span>
            </span>
            {stock.marketCap > 0 && (
              <span>
                <span className="text-muted-2 text-xs">{language === "ko" ? "시총" : "Mkt Cap"} </span>
                <span className="font-medium text-ink">{fmtCap(stock.marketCap)}</span>
              </span>
            )}
            {stock.volume > 0 && (
              <span>
                <span className="text-muted-2 text-xs">{language === "ko" ? "거래량" : "Vol"} </span>
                <span className="font-medium text-ink">{fmtVol(stock.volume)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bull / Bear */}
        <div className="border-b border-white/10 px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
            {language === "ko" ? "내 시각" : "My Signal"}
          </p>
          <div className="flex gap-2">
            {(["bull", "bear"] as const).map((side) => (
              <button
                key={side}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-bold transition",
                  vote === side && side === "bull"
                    ? "border-success bg-success/15 text-success"
                    : vote === side && side === "bear"
                    ? "border-danger bg-danger/15 text-danger"
                    : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-ink",
                )}
                onClick={() => onVote(vote === side ? null : side)}
                type="button"
              >
                {side === "bull" ? "▲" : "▼"}
                {side === "bull"
                  ? language === "ko" ? "강세" : "Bullish"
                  : language === "ko" ? "약세" : "Bearish"}
              </button>
            ))}
          </div>
        </div>

        {/* News */}
        <div className="max-h-72 overflow-y-auto px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
            {language === "ko" ? "최신 뉴스" : "Latest News"}
          </p>
          {newsLoading && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              {language === "ko" ? "뉴스 불러오는 중..." : "Loading news..."}
            </div>
          )}
          {!newsLoading && news.length === 0 && (
            <p className="py-2 text-sm text-muted-2">
              {language === "ko" ? "뉴스를 불러오지 못했습니다." : "No news available."}
            </p>
          )}
          <div className="divide-y divide-white/[0.06]">
            {news.map((item, i) => (
              <a
                className="block py-2.5 transition hover:opacity-80"
                href={item.url}
                key={i}
                rel="noopener noreferrer"
                target="_blank"
              >
                <p className="text-sm font-medium leading-snug text-ink">{item.title}</p>
                <div className="mt-1 flex gap-2 text-[0.7rem] text-muted-2">
                  <span>{item.source}</span>
                  <span>·</span>
                  <span>{fmtRelative(item.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-3">
          <a
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-ink"
            href={`https://www.tradingview.com/chart/?symbol=${stock.symbol}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            TradingView Chart ↗
          </a>
          <a
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-ink"
            href={`https://finance.yahoo.com/quote/${stock.symbol}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Yahoo Finance ↗
          </a>
          <a
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-ink"
            href={`/community?q=${encodeURIComponent(stock.symbol)}`}
          >
            {language === "ko" ? "커뮤니티 토론 →" : "Community →"}
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Heatmap grid ──────────────────────────────────────────────────────────────

function HeatmapGrid({
  stocks,
  onSelect,
}: {
  stocks: StockQuote[];
  onSelect: (stock: StockQuote) => void;
}) {
  const maxCap = stocks.reduce((m, s) => Math.max(m, s.marketCap), 0) || 1;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gridAutoRows: "58px",
        gridAutoFlow: "dense",
        gap: "2px",
        padding: "2px",
      }}
    >
      {stocks.map((stock) => {
        const tile = getTileConfig(stock.marketCap, maxCap);
        const bg     = getTileBg(stock.changePercent);
        const border = getTileBorder(stock.changePercent);

        return (
          <button
            key={stock.symbol}
            className="group relative overflow-hidden rounded text-left transition-opacity duration-150 hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => onSelect(stock)}
            style={{
              gridColumn: `span ${tile.colSpan}`,
              gridRow: `span ${tile.rowSpan}`,
              background: bg,
              border: `1px solid ${border}`,
            }}
            title={`${stock.symbol} · ${stock.name} · ${pctStr(stock.changePercent)}`}
            type="button"
          >
            <div className="flex h-full w-full flex-col items-center justify-center px-1 text-center">
              <span
                className="truncate font-bold leading-tight text-ink"
                style={{ fontSize: tile.fontSize }}
              >
                {stock.symbol}
              </span>

              {tile.showName && (
                <span
                  className="mt-0.5 max-w-full truncate leading-none text-ink/60"
                  style={{ fontSize: tile.fontSize - 2.5 }}
                >
                  {stock.name}
                </span>
              )}

              <span
                className={cn("mt-0.5 font-semibold leading-none", pctColor(stock.changePercent))}
                style={{ fontSize: tile.fontSize - 1 }}
              >
                {pctStr(stock.changePercent)}
              </span>

              {tile.showPrice && (
                <span
                  className="mt-0.5 leading-none text-ink/70"
                  style={{ fontSize: tile.fontSize - 2 }}
                >
                  ${fmtPrice(stock.price)}
                </span>
              )}
            </div>

            {/* Hover tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-max -translate-x-1/2 rounded-md border border-white/10 bg-[#0D111C] px-2.5 py-1.5 text-[11px] leading-snug text-ink shadow-lg group-hover:block">
              <span className="font-bold">{stock.symbol}</span> · {stock.name}
              <br />
              <span className={pctColor(stock.changePercent)}>{pctStr(stock.changePercent)}</span>
              {" · "}${fmtPrice(stock.price)}
              {stock.marketCap > 0 && (
                <><br /><span className="text-muted-2">Cap </span>{fmtCap(stock.marketCap)}</>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function StockHeatmap() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StockFilter>("sp500");
  const [language, setLanguage] = useState<"en" | "ko">("en");
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);
  const [votes, setVotes] = useState<BullBearVotes>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const marketStatus = getMarketStatus();

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("chainbrief-preferences") ?? "{}") as { language?: string };
      if (prefs.language === "ko") setLanguage("ko");
    } catch { /* ignore */ }
    setVotes(readVotes());
  }, []);

  const fetchData = useCallback(async (f: StockFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market/stocks?filter=${f}`, { cache: "no-store" });
      const json = (await res.json()) as StockData;
      setData(json);
    } catch {
      setData({ stocks: [], error: language === "ko" ? "데이터를 불러오지 못했습니다." : "Could not load market data.", refreshedAt: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void fetchData(filter);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => void fetchData(filter), 5 * 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [filter, fetchData]);

  function handleVote(symbol: string, side: "bull" | "bear" | null) {
    saveVote(symbol, side);
    setVotes((prev) => ({ ...prev, [symbol]: side }));
  }

  // Group stocks by sector for grouped filters
  const currentFilter = FILTER_CONFIG.find((f) => f.id === filter)!;
  const stocks = data?.stocks ?? [];

  const grouped = currentFilter.grouped
    ? SECTOR_ORDER.reduce<Record<string, StockQuote[]>>((acc, sector) => {
        const group = stocks.filter((s) => s.sector === sector);
        if (group.length > 0) acc[sector] = group;
        return acc;
      }, {} as Record<string, StockQuote[]>)
    : null;

  const gainers = stocks.filter((s) => s.changePercent > 0).length;
  const losers  = stocks.filter((s) => s.changePercent < 0).length;
  const topGainer = stocks.reduce<StockQuote | null>((b, s) => !b || s.changePercent > b.changePercent ? s : b, null);
  const topLoser  = stocks.reduce<StockQuote | null>((b, s) => !b || s.changePercent < b.changePercent ? s : b, null);

  return (
    <section className="section-space">
      <Container>
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">
              {language === "ko" ? "주식 시장" : "Stock Market"}
            </p>
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">
              {language === "ko" ? "주식 히트맵" : "Stock Market Heatmap"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {language === "ko"
                ? "Financial Modeling Prep 실시간 데이터 · 시가총액 기준 타일 크기 · 5분 자동 갱신"
                : "Financial Modeling Prep live data · Tile size by market cap · Auto-refreshes every 5 min"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Market status */}
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  marketStatus.open ? "animate-pulse bg-success" : "bg-muted-2",
                )}
              />
              <span className={marketStatus.open ? "text-success" : "text-muted-2"}>
                {marketStatus.label}
              </span>
            </span>

            {data && !loading && (
              <span className="text-xs text-muted-2">
                {language === "ko" ? "업데이트" : "Updated"} {fmtTime(data.refreshedAt)}
              </span>
            )}

            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-ink disabled:opacity-40"
              disabled={loading}
              onClick={() => void fetchData(filter)}
              type="button"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full bg-accent", loading && "animate-pulse")} />
              {loading
                ? language === "ko" ? "불러오는 중..." : "Loading..."
                : language === "ko" ? "새로고침" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {FILTER_CONFIG.map((f) => (
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
              {f.label}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        {!loading && stocks.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-2">
            <span>
              <span className="text-muted">{stocks.length}</span>{" "}
              {language === "ko" ? "종목" : "stocks"}
            </span>
            <span className="text-success">▲ {gainers} {language === "ko" ? "상승" : "up"}</span>
            <span className="text-danger">▼ {losers} {language === "ko" ? "하락" : "down"}</span>
            {topGainer && (
              <span>
                {language === "ko" ? "최고 상승" : "Top gainer"}{" "}
                <span className="font-semibold text-success">
                  {topGainer.symbol} {pctStr(topGainer.changePercent)}
                </span>
              </span>
            )}
            {topLoser && (
              <span>
                {language === "ko" ? "최고 하락" : "Top loser"}{" "}
                <span className="font-semibold text-danger">
                  {topLoser.symbol} {pctStr(topLoser.changePercent)}
                </span>
              </span>
            )}
          </div>
        )}

        {/* No API key message */}
        {!loading && (data?.needsApiKey || data?.error?.includes("FMP_API_KEY")) && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-6 text-center">
            <p className="text-base font-semibold text-amber-200">
              {language === "ko" ? "API 키가 필요합니다" : "API Key Required"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {language === "ko"
                ? "Financial Modeling Prep에서 무료 API 키를 발급받아 Vercel 환경변수에 FMP_API_KEY로 추가해 주세요."
                : "Get a free API key at financialmodelingprep.com and add it to your Vercel environment variables as FMP_API_KEY."}
            </p>
            <a
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/15 px-4 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/25"
              href="https://financialmodelingprep.com/developer/docs"
              rel="noopener noreferrer"
              target="_blank"
            >
              Get Free API Key ↗
            </a>
          </div>
        )}

        {/* Heatmap container */}
        {!(data?.needsApiKey || data?.error?.includes("FMP_API_KEY")) && (
          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-surface">
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

            {!loading && data?.error && !(data.needsApiKey || data.error.includes("FMP_API_KEY")) && (
              <div className="flex h-72 flex-col items-center justify-center gap-3 text-sm text-muted">
                <p>{data.error}</p>
                <button
                  className="rounded-md border border-white/10 px-4 py-2 text-xs font-semibold transition hover:border-accent/40 hover:text-ink"
                  onClick={() => void fetchData(filter)}
                  type="button"
                >
                  {language === "ko" ? "다시 시도" : "Try again"}
                </button>
              </div>
            )}

            {!loading && !data?.error && stocks.length === 0 && (
              <div className="flex h-72 items-center justify-center text-sm text-muted">
                {language === "ko" ? "표시할 종목이 없습니다." : "No stocks to display."}
              </div>
            )}

            {!loading && !data?.error && stocks.length > 0 && (
              <>
                {grouped ? (
                  /* Sector-grouped layout */
                  <div className="divide-y divide-white/[0.05]">
                    {(Object.entries(grouped) as [StockSector, StockQuote[]][]).map(
                      ([sector, sectorStocks]) => (
                        <div key={sector} className="px-0.5 py-0.5">
                          <div className="flex items-center gap-2 px-3 py-1.5">
                            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-2">
                              {sector}
                            </span>
                            <span className="text-[0.68rem] text-muted-2 opacity-50">
                              {sectorStocks.length}
                            </span>
                          </div>
                          <HeatmapGrid stocks={sectorStocks} onSelect={setSelectedStock} />
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  /* Flat layout for single-sector/specialized filters */
                  <HeatmapGrid stocks={stocks} onSelect={setSelectedStock} />
                )}
              </>
            )}
          </div>
        )}

        {/* Legend */}
        {!loading && stocks.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-2">
            <span>{language === "ko" ? "색상" : "Color"}:</span>
            {[
              { bg: "rgba(37,198,133,0.85)", label: ">+4%" },
              { bg: "rgba(37,198,133,0.40)", label: "+0%" },
              { bg: "rgba(255,94,108,0.40)", label: "-0%" },
              { bg: "rgba(255,94,108,0.85)", label: "<-4%" },
            ].map((item) => (
              <span className="flex items-center gap-1" key={item.label}>
                <span className="inline-block h-3 w-4 rounded-sm" style={{ background: item.bg }} />
                {item.label}
              </span>
            ))}
            <span className="ml-2">{language === "ko" ? "크기 = 시가총액" : "Size = Market Cap"}</span>
          </div>
        )}
      </Container>

      {/* Stock detail modal */}
      {selectedStock && (
        <StockModal
          language={language}
          onClose={() => setSelectedStock(null)}
          onVote={(side) => handleVote(selectedStock.symbol, side)}
          stock={selectedStock}
          vote={votes[selectedStock.symbol] ?? null}
        />
      )}
    </section>
  );
}
