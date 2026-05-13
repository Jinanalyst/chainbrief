export type CustomBriefSource = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
};

export const CUSTOM_BRIEF_SOURCES_KEY = "chain-brief-custom-brief-sources";

export function readCustomBriefSources(): CustomBriefSource[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(CUSTOM_BRIEF_SOURCES_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeStoredSource)
      .filter((s): s is CustomBriefSource => Boolean(s));
  } catch {
    return [];
  }
}

export function writeCustomBriefSources(sources: CustomBriefSource[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CUSTOM_BRIEF_SOURCES_KEY, JSON.stringify(sources));
  window.dispatchEvent(new CustomEvent("chain-brief-custom-brief-sources-changed"));
}

export function createCustomBriefSource(name: string, url: string): CustomBriefSource {
  return {
    id: `custom-brief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 80),
    url: url.trim(),
    enabled: true,
    createdAt: new Date().toISOString(),
  };
}

export function isValidBriefSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeStoredSource(value: unknown): CustomBriefSource | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const s = value as Partial<CustomBriefSource>;
  const name = typeof s.name === "string" ? s.name.trim().slice(0, 80) : "";
  const url = typeof s.url === "string" ? s.url.trim() : "";

  if (!name || !isValidBriefSourceUrl(url)) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: typeof s.id === "string" ? s.id : `custom-brief-${now}`,
    name,
    url,
    enabled: s.enabled !== false,
    createdAt: typeof s.createdAt === "string" ? s.createdAt : now,
  };
}
