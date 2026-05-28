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
  {
    id: "syukaworld",
    name: "슈카월드",
    provider: "youtube",
    category: "Macro",
    url: youtubeFeed("UCsJ6RuBiTVWRX156FVbeaGg"),
  },
  {
    id: "3protv",
    name: "삼프로TV",
    provider: "youtube",
    category: "Macro",
    url: youtubeFeed("UChlv4GSd7OQl3js-jkLOnFA"),
  },
  {
    id: "us-stock-crazy",
    name: "미국주식에 미치다 TV",
    provider: "youtube",
    category: "Research",
    url: youtubeFeed("UCibo107UgpabxGBxEa6ixqA"),
  },
  {
    id: "parkgomhee-tv",
    name: "박곰희TV",
    provider: "youtube",
    category: "Research",
    url: youtubeFeed("UCr7XsrSrvAn_WcU4kF99bbQ"),
  },
  {
    id: "talent-investment",
    name: "달란트투자",
    provider: "youtube",
    category: "Research",
    url: youtubeFeed("UCBM86JVoHLqg9irpR2XKvGw"),
  },
  {
    id: "dipie",
    name: "디피",
    provider: "youtube",
    category: "Research",
    url: youtubeFeed("UCSJELOytOHjywS1ynjNsLDA"),
  },
];

export const SNS_REFRESH_SECONDS = 20 * 60;
