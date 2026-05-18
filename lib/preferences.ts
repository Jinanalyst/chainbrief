export const ACTIVE_SOURCES = ["CoinDesk", "Cointelegraph", "Decrypt", "Blockworks"];
export const STOCK_REGIONS = ["US", "Korea", "Global"];
export const STOCK_TYPES = ["Stocks", "ETFs", "Earnings", "Macro", "Economy", "Indices"];

export const BRIEF_CATEGORIES = [
  "All",
  "Stock Market",
  "Bitcoin",
  "Ethereum",
  "Solana",
  "DeFi",
  "Macro",
  "Regulation",
  "Stablecoins",
  "AI & Crypto",
  "Web3",
];

export type BriefPreferences = {
  sources: string[];
  category: string;
  includeKeywords: string;
  excludeKeywords: string;
  stockRegions: string[];
  stockTypes: string[];
  language: "ko" | "en";
  notificationsEnabled: boolean;
  notificationSoundEnabled: boolean;
  notificationKeywords: string[];
  notificationPermission: "default" | "granted" | "denied" | "unsupported";
};

export const defaultPreferences: BriefPreferences = {
  sources: ACTIVE_SOURCES,
  category: "All",
  includeKeywords: "",
  excludeKeywords: "",
  stockRegions: STOCK_REGIONS,
  stockTypes: STOCK_TYPES,
  language: "ko",
  notificationsEnabled: false,
  notificationSoundEnabled: true,
  notificationKeywords: [],
  notificationPermission: "default",
};

export const PREFERENCES_STORAGE_KEY = "chain-brief-preferences";
