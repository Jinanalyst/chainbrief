import type { SnsCategory, SnsSource } from "@/lib/sns/types";

export const SNS_CATEGORIES: SnsCategory[] = [
  "All",
  "Research",
  "Macro",
  "Bitcoin",
  "Ethereum",
  "Solana",
  "Security",
  "AI & Crypto",
];

const youtubeFeed = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

export const snsSources: SnsSource[] = [
  {
    id: "coin-bureau",
    name: "Coin Bureau",
    provider: "youtube",
    category: "Research",
    url: youtubeFeed("UCqK_GSMbpiV8spgD3ZGloSw"),
  },
  {
    id: "bankless",
    name: "Bankless",
    provider: "youtube",
    category: "Ethereum",
    url: youtubeFeed("UCAl9Ld79qaZxp9JzEOwd3aA"),
  },
  {
    id: "into-the-cryptoverse",
    name: "Into The Cryptoverse",
    provider: "youtube",
    category: "Macro",
    url: youtubeFeed("UCRvqjQPSeaWn-uEx-w0XOIg"),
  },
  {
    id: "altcoin-daily",
    name: "Altcoin Daily",
    provider: "youtube",
    category: "Bitcoin",
    url: youtubeFeed("UCbLhGKVY-bJPcawebgtNfbw"),
  },
  {
    id: "ethereum-foundation",
    name: "Ethereum Foundation",
    provider: "youtube",
    category: "Ethereum",
    url: youtubeFeed("UCNOfzGXD_C9YMYmnefmPH0g"),
  },
  {
    id: "solana",
    name: "Solana",
    provider: "youtube",
    category: "Solana",
    url: youtubeFeed("UC9AdQPUe4BdVJ8M9X7wxHUA"),
  },
];

export const SNS_REFRESH_SECONDS = 20 * 60;
