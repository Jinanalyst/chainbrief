// Shared types and option lists for the Chain Brief analyst profile.
// Used by the onboarding wizard and the profile editor so both stay in sync.

export type ChainBriefSocialLinks = {
  x: string;
  telegram: string;
  discord: string;
  website: string;
};

export type ChainBriefProfile = {
  // Original profile fields — preserved for backward compatibility.
  displayName: string;
  role: string;
  interests: string[];
  bio: string;
  socialLinks: ChainBriefSocialLinks;
  // New analyst-profile fields collected during onboarding.
  marketInterests: string[];
  analysisStyle: string;
  experienceLevel: string;
  preferredPostTypes: string[];
  analystBio: string;
  onboardedAt?: string;
  updatedAt?: string;
};

export const PROFILE_ROLES = [
  "Crypto researcher",
  "Investor",
  "Builder",
  "Community member",
  "Analyst",
] as const;

export const MARKET_INTERESTS = [
  "BTC",
  "ETH",
  "Solana",
  "Macro",
  "AI",
  "ETFs",
  "Regulation",
  "DeFi",
  "Stablecoins",
  "Korean market",
] as const;

export const ANALYSIS_STYLES = [
  "Short-term Trader",
  "Long-term Investor",
  "News Interpreter",
  "On-chain Analyst",
  "Macro Analyst",
  "Risk-focused Analyst",
] as const;

export const EXPERIENCE_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
] as const;

export const PREFERRED_POST_TYPES = [
  "News Analysis",
  "Bull/Bear Opinion",
  "Chart Review",
  "Investment Thesis",
  "Risk Warning",
  "Educational Content",
] as const;

export const DEFAULT_SOCIAL_LINKS: ChainBriefSocialLinks = {
  x: "",
  telegram: "",
  discord: "",
  website: "",
};

export const EMPTY_PROFILE: ChainBriefProfile = {
  displayName: "",
  role: PROFILE_ROLES[0],
  interests: [],
  bio: "",
  socialLinks: DEFAULT_SOCIAL_LINKS,
  marketInterests: [],
  analysisStyle: "",
  experienceLevel: "",
  preferredPostTypes: [],
  analystBio: "",
};

export function readProfile(metadata: Record<string, unknown> | null | undefined): ChainBriefProfile | null {
  const value = metadata?.chainBriefProfile;
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<ChainBriefProfile>;
  const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    displayName: str(p.displayName),
    role: str(p.role, PROFILE_ROLES[0]),
    interests: arr(p.interests),
    bio: str(p.bio),
    socialLinks: sanitizeSocialLinks(p.socialLinks),
    marketInterests: arr(p.marketInterests),
    analysisStyle: str(p.analysisStyle),
    experienceLevel: str(p.experienceLevel),
    preferredPostTypes: arr(p.preferredPostTypes),
    analystBio: str(p.analystBio),
    onboardedAt: typeof p.onboardedAt === "string" ? p.onboardedAt : undefined,
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : undefined,
  };
}

export function sanitizeSocialLinks(value: unknown): ChainBriefSocialLinks {
  if (!value || typeof value !== "object") return DEFAULT_SOCIAL_LINKS;
  const links = value as Partial<ChainBriefSocialLinks>;
  return {
    x: typeof links.x === "string" ? links.x : "",
    telegram: typeof links.telegram === "string" ? links.telegram : "",
    discord: typeof links.discord === "string" ? links.discord : "",
    website: typeof links.website === "string" ? links.website : "",
  };
}

export function isOnboardingComplete(profile: ChainBriefProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.onboardedAt ||
      (profile.marketInterests.length > 0 &&
        profile.analysisStyle &&
        profile.experienceLevel &&
        profile.preferredPostTypes.length > 0 &&
        profile.analystBio.trim()),
  );
}
