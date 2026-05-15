import { NextResponse, type NextRequest } from "next/server";
import {
  getSymbolsForFilter,
  getMetaForSymbol,
  type StockFilter,
} from "@/lib/market/stock-symbols";

export type StockQuote = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  open: number;
  previousClose: number;
};

type FmpQuote = {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  marketCap: number;
  volume: number;
  open: number;
  previousClose: number;
};

const VALID_FILTERS: StockFilter[] = [
  "all", "sp500", "nasdaq100", "dow", "tech", "ai", "semiconductors", "finance", "energy",
];

const CACHE_SECONDS = 300; // 5 minutes
const REQUEST_TIMEOUT_MS = 12_000;

function keyError(msg: string) {
  return NextResponse.json(
    { error: msg, stocks: [], refreshedAt: new Date().toISOString(), needsApiKey: true },
    { status: 503 },
  );
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.FMP_API_KEY?.trim();

  if (!apiKey) {
    return keyError("FMP_API_KEY is not configured. Add it to your Vercel environment variables.");
  }

  const { searchParams } = new URL(request.url);
  const rawFilter = searchParams.get("filter") ?? "all";
  const filter: StockFilter = VALID_FILTERS.includes(rawFilter as StockFilter)
    ? (rawFilter as StockFilter)
    : "all";

  const symbols = getSymbolsForFilter(filter);
  const symbolStr = symbols.join(",");

  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbolStr)}?apikey=${apiKey}`;
    const response = await fetch(url, {
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // FMP returns 401/403 for invalid or missing keys
    if (response.status === 401 || response.status === 403) {
      return keyError("FMP_API_KEY is invalid. Please check your key at financialmodelingprep.com.");
    }

    if (response.status === 429) {
      return keyError("FMP API rate limit reached. Upgrade your plan or wait before retrying.");
    }

    if (!response.ok) {
      throw new Error(`FMP responded ${response.status}`);
    }

    const raw = (await response.json()) as FmpQuote[] | Record<string, string>;

    // FMP sometimes returns {"Error Message": "..."} for bad keys on HTTP 200
    if (!Array.isArray(raw)) {
      const fmpMsg = raw["Error Message"] ?? raw["message"] ?? "";
      if (fmpMsg) {
        return keyError(`FMP API error: ${fmpMsg}`);
      }
      throw new Error("Unexpected FMP response format");
    }

    const stocks: StockQuote[] = raw
      .filter((q) => q.price > 0)
      .map((q) => {
        const meta = getMetaForSymbol(q.symbol);
        return {
          symbol: q.symbol,
          name: meta.name,
          sector: meta.sector,
          price: q.price,
          change: q.change ?? 0,
          changePercent: q.changesPercentage ?? 0,
          marketCap: q.marketCap ?? 0,
          volume: q.volume ?? 0,
          open: q.open ?? q.price,
          previousClose: q.previousClose ?? q.price,
        };
      })
      .sort((a, b) => b.marketCap - a.marketCap);

    return NextResponse.json(
      { stocks, refreshedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
        },
      },
    );
  } catch (error) {
    console.error("[stocks route] FMP fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock data. Please try again.", stocks: [], refreshedAt: new Date().toISOString() },
      { status: 502 },
    );
  }
}
