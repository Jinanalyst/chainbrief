// ─── Analyst Newsletter Post System ───────────────────────────────────────────
// Posts are stored in localStorage for client-side persistence,
// with API routes ready for server-side email delivery.

export const ANALYST_POSTS_KEY = "chain-brief-analyst-posts";
export const ANALYST_SUBS_PREFIX = "chain-brief-analyst-subs-"; // + analystId
export const ANALYST_MY_SUBS_KEY = "chain-brief-my-subscriptions";
export const ANALYST_PROFILES_KEY = "chain-brief-analyst-profiles";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalystPost = {
  id: string;
  analystId: string;       // stable ID = slugified display name
  analystName: string;
  analystBio: string;
  analystAvatar: string;   // initials fallback e.g. "JK"
  title: string;
  preview: string;         // ~160 chars, always visible
  body: string;            // full content; gated when isPremium + not subscribed
  isPremium: boolean;
  publishedAt: string;
  emailsSent: number;
  tags: string[];
  topic: string;
};

export type AnalystProfile = {
  id: string;              // slugified display name
  name: string;
  bio: string;
  avatar: string;
  membershipPrice: number; // USD/month
  membershipEnabled: boolean;
};

export type MySubscription = {
  analystId: string;
  email: string;
  subscribedAt: string;
};

// ─── Slugify ──────────────────────────────────────────────────────────────────

export function slugifyAnalyst(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "analyst";
}

// ─── Analyst Posts ────────────────────────────────────────────────────────────

export function readAnalystPosts(): AnalystPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANALYST_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readAnalystPostsByAuthor(analystId: string): AnalystPost[] {
  return readAnalystPosts()
    .filter((p) => p.analystId === analystId)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function publishAnalystPost(post: Omit<AnalystPost, "id" | "publishedAt" | "emailsSent">): AnalystPost {
  const next: AnalystPost = {
    ...post,
    id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    publishedAt: new Date().toISOString(),
    emailsSent: readSubscriberEmails(post.analystId).length,
  };
  const all = [next, ...readAnalystPosts()].slice(0, 200);
  if (typeof window !== "undefined") {
    localStorage.setItem(ANALYST_POSTS_KEY, JSON.stringify(all));
  }
  return next;
}

export function deleteAnalystPost(postId: string) {
  const filtered = readAnalystPosts().filter((p) => p.id !== postId);
  if (typeof window !== "undefined") {
    localStorage.setItem(ANALYST_POSTS_KEY, JSON.stringify(filtered));
  }
}

// ─── Analyst Profiles ─────────────────────────────────────────────────────────

export function readAnalystProfiles(): AnalystProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANALYST_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertAnalystProfile(profile: AnalystProfile) {
  const all = readAnalystProfiles().filter((p) => p.id !== profile.id);
  const next = [profile, ...all];
  if (typeof window !== "undefined") {
    localStorage.setItem(ANALYST_PROFILES_KEY, JSON.stringify(next));
  }
}

export function readAnalystProfile(analystId: string): AnalystProfile | null {
  return readAnalystProfiles().find((p) => p.id === analystId) ?? null;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

/** Returns list of subscriber emails for a given analyst. */
export function readSubscriberEmails(analystId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANALYST_SUBS_PREFIX + analystId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSubscriber(analystId: string, email: string) {
  const current = readSubscriberEmails(analystId);
  if (current.includes(email)) return; // idempotent
  const next = [...current, email.trim().toLowerCase()];
  if (typeof window !== "undefined") {
    localStorage.setItem(ANALYST_SUBS_PREFIX + analystId, JSON.stringify(next));
  }
}

/** Returns the list of analysts the current browser-user has subscribed to. */
export function readMySubscriptions(): MySubscription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANALYST_MY_SUBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isSubscribedTo(analystId: string): boolean {
  return readMySubscriptions().some((s) => s.analystId === analystId);
}

export function subscribeToAnalyst(analystId: string, email: string) {
  // Add to subscriber list for this analyst
  addSubscriber(analystId, email);

  // Add to "my subscriptions" list
  const current = readMySubscriptions().filter((s) => s.analystId !== analystId);
  const next: MySubscription[] = [
    ...current,
    { analystId, email, subscribedAt: new Date().toISOString() },
  ];
  if (typeof window !== "undefined") {
    localStorage.setItem(ANALYST_MY_SUBS_KEY, JSON.stringify(next));
  }
}

export function unsubscribeFromAnalyst(analystId: string) {
  const mySubs = readMySubscriptions().filter((s) => s.analystId !== analystId);
  if (typeof window !== "undefined") {
    localStorage.setItem(ANALYST_MY_SUBS_KEY, JSON.stringify(mySubs));
  }
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Collect unique analyst IDs who have published at least one post. */
export function readActiveAnalystIds(): string[] {
  const posts = readAnalystPosts();
  return [...new Set(posts.map((p) => p.analystId))];
}
