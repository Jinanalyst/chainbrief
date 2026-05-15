export type CustomRssSourceType = "rss" | "youtube";

export type CustomRssSourceLanguage = "en" | "ko" | "multi";

export type CustomRssSource = {
  id: string;
  name: string;
  url: string;
  type: CustomRssSourceType;
  language: CustomRssSourceLanguage;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export const CUSTOM_RSS_STORAGE_KEY = "chainbrief.customRssSources.v1";
