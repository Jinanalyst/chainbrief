import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getMarketData = unstable_cache(
  async () => {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano&price_change_percentage=24h",
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "ChainBrief/0.1 Market Reader",
        },
        next: {
          revalidate: 60,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Market data returned ${response.status}`);
    }

    const payload = (await response.json()) as Array<{
      id: string;
      current_price?: number;
      price_change_percentage_24h?: number;
    }>;

    return payload.map((asset) => ({
      id: asset.id,
      currentPrice: asset.current_price ?? null,
      change24h: asset.price_change_percentage_24h ?? null,
    }));
  },
  ["chain-brief-market-data"],
  {
    revalidate: 60,
  },
);

export async function GET() {
  try {
    const assets = await getMarketData();

    return NextResponse.json(
      {
        assets,
        refreshedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        assets: [],
        error: "Market data could not be loaded right now.",
        refreshedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
