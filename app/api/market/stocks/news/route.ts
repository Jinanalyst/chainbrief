import { NextResponse, type NextRequest } from "next/server";

type FmpNewsItem = {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
};

export type StockNewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
};

const CACHE_SECONDS = 900; // 15 minutes
const REQUEST_TIMEOUT_MS = 8_000;

export async function GET(request: NextRequest) {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ news: [], error: "FMP_API_KEY not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase().slice(0, 10);

  if (!symbol || !/^[A-Z.]{1,10}$/.test(symbol)) {
    return NextResponse.json({ news: [], error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=6&apikey=${apiKey}`;
    const response = await fetch(url, {
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`FMP news responded ${response.status}`);
    }

    const raw: FmpNewsItem[] = await response.json();

    if (!Array.isArray(raw)) {
      return NextResponse.json({ news: [] });
    }

    const news: StockNewsItem[] = raw.map((item) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      source: item.site ?? "Financial News",
      publishedAt: item.publishedDate ?? new Date().toISOString(),
      summary: item.text ? item.text.slice(0, 200).trim() + (item.text.length > 200 ? "…" : "") : "",
    }));

    return NextResponse.json(
      { news },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=120`,
        },
      },
    );
  } catch (error) {
    console.error("[stocks/news] FMP fetch failed:", error);
    return NextResponse.json({ news: [], error: "Failed to fetch news" }, { status: 502 });
  }
}
