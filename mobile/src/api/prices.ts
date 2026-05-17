import type { PriceTicker } from "@/types";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true";

const FALLBACK: PriceTicker[] = [
  { symbol: "BTC", name: "Bitcoin", priceUsd: 78134.2, changePct24h: -1.22 },
  { symbol: "ETH", name: "Ethereum", priceUsd: 2180.42, changePct24h: -1.97 },
];

type CoingeckoResp = {
  bitcoin?: { usd: number; usd_24h_change?: number };
  ethereum?: { usd: number; usd_24h_change?: number };
};

export async function fetchPrices(): Promise<PriceTicker[]> {
  try {
    const res = await fetch(COINGECKO_URL);
    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as CoingeckoResp;
    return [
      {
        symbol: "BTC",
        name: "Bitcoin",
        priceUsd: data.bitcoin?.usd ?? FALLBACK[0].priceUsd,
        changePct24h: data.bitcoin?.usd_24h_change ?? FALLBACK[0].changePct24h,
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        priceUsd: data.ethereum?.usd ?? FALLBACK[1].priceUsd,
        changePct24h: data.ethereum?.usd_24h_change ?? FALLBACK[1].changePct24h,
      },
    ];
  } catch {
    return FALLBACK;
  }
}
