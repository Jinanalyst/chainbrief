export type CommunityStance = "Bullish" | "Bearish" | "Neutral" | "Question";

export type CommunityPost = {
  id: string;
  title: string;
  body: string;
  preview: string;
  author: string;
  avatar?: string;
  category: string;
  publishedAt: string;
  likes: number;
  commentsCount: number;
  views: number;
  tags: string[];
  stance?: CommunityStance;
  postKind?: "free" | "analysis" | "news" | "event";
};

export type PriceTicker = {
  symbol: "BTC" | "ETH";
  name: string;
  priceUsd: number;
  changePct24h: number;
};

export type LoungeTab = "lounge" | "expert";
export type FilterPill = "latest" | "hot" | "event";
