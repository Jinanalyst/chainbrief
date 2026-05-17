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
  // ── Crypto ──────────────────────────────────────────────────────────────────
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

  // ── Stock Market ─────────────────────────────────────────────────────────────
  {
    id: "marketwatch",
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    description: "Top financial markets, equities, and business news from MarketWatch.",
    enabledByDefault: true,
    defaultCategory: "Stock Market",
  },
  {
    id: "cnbc-markets",
    name: "CNBC Markets",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
    description: "U.S. and global equity market news and analysis from CNBC.",
    enabledByDefault: true,
    defaultCategory: "Stock Market",
  },
  {
    id: "reuters-business",
    name: "Reuters Business",
    url: "https://feeds.reuters.com/reuters/businessNews",
    description: "Global business, corporate, and financial market news from Reuters.",
    enabledByDefault: true,
    defaultCategory: "Stock Market",
  },
];
