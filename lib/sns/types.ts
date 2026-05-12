export type SnsProvider = "youtube" | "rss" | "telegram" | "x" | "mirror" | "substack";

export type SnsCategory =
  | "All"
  | "Research"
  | "Macro"
  | "Bitcoin"
  | "Ethereum"
  | "Solana"
  | "Security"
  | "AI & Crypto";

export type SnsSource = {
  id: string;
  name: string;
  provider: SnsProvider;
  category: Exclude<SnsCategory, "All">;
  url: string;
};

export type SnsVideo = {
  id: string;
  provider: SnsProvider;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
  description: string;
  category: Exclude<SnsCategory, "All">;
  tags: string[];
};
