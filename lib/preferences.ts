export const ACTIVE_SOURCES = [
  "매일경제",
  "한국경제",
  "이투데이",
  "연합뉴스",
  "한국은행",
  "국토교통부",
  "CoinDesk",
  "Cointelegraph",
  "Decrypt",
  "블록미디어",
];
export const STOCK_REGIONS = ["US", "Korea", "Global"];
export const STOCK_TYPES = ["Stocks", "ETFs", "Earnings", "Macro", "Economy", "Indices"];

export const BRIEF_CATEGORIES = [
  "All",
  "국내증시",
  "Macro",
  "부동산",
  "가상자산",
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
