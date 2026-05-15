import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

const STABLE_PREFIXES = ["USDC", "BUSD", "DAI", "TUSD", "USDT", "FDUSD", "USDP", "FRAX"];

const getHeatmapData = unstable_cache(
  async () => {
    const response = await fetch("https://api.binance.com/api/v3/ticker/24hr", {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Binance API returned ${response.status}`);
    }

    const tickers: BinanceTicker[] = await response.json();

    const coins = tickers
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

    return coins;
  },
  ["binance-heatmap-data"],
  { revalidate: 60 },
);

export async function GET() {
  try {
    const coins = await getHeatmapData();
    return NextResponse.json(
      { coins, refreshedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json(
      { coins: [], error: "Market data unavailable", refreshedAt: new Date().toISOString() },
      { status: 503 },
    );
  }
}
