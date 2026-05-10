export const ACTIVE_SOURCES = ["CoinDesk", "Cointelegraph", "Decrypt", "Blockworks"];

export const BRIEF_CATEGORIES = [
  "All",
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
  language: "ko" | "en";
};

export const defaultPreferences: BriefPreferences = {
  sources: ACTIVE_SOURCES,
  category: "All",
  includeKeywords: "",
  excludeKeywords: "",
  language: "ko",
};

export const PREFERENCES_STORAGE_KEY = "chain-brief-preferences";
