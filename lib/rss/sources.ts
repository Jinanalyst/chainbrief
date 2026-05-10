export type RssSource = {
  id: string;
  name: string;
  url: string;
  description: string;
  enabledByDefault: boolean;
  defaultCategory: string;
};

export const RSS_REFRESH_SECONDS = 20 * 60;

export const rssSources: RssSource[] = [
  {
    id: "coindesk",
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    description: "Crypto markets, policy, and institutional digital asset news.",
    enabledByDefault: true,
    defaultCategory: "Markets",
  },
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
    description: "Broad crypto, blockchain, Web3, and market headlines.",
    enabledByDefault: true,
    defaultCategory: "Crypto",
  },
  {
    id: "decrypt",
    name: "Decrypt",
    url: "https://decrypt.co/feed",
    description: "Web3, crypto culture, business, and digital asset news.",
    enabledByDefault: true,
    defaultCategory: "Web3",
  },
  {
    id: "blockworks",
    name: "Blockworks",
    url: "https://blockworks.co/feed",
    description: "Crypto markets, DeFi, policy, and institutional coverage.",
    enabledByDefault: true,
    defaultCategory: "Markets",
  },
];
