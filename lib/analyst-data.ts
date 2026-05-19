import { createClient as createServerClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig, createAdminClient } from "@/lib/supabase/admin";

export type AnalystApplicationStatus = "pending" | "approved" | "rejected";
export type AnalystExperienceYears = "lt_1" | "1_3" | "3_5" | "5_plus";
export type AnalystMembershipStatus = "active" | "cancelled";
export type RevenueEventType = "subscription" | "tip";

export type AnalystApplicationRow = {
  id: string;
  user_id: string;
  full_name: string;
  twitter_handle: string | null;
  expertise_areas: string[];
  experience_years: AnalystExperienceYears;
  bio: string;
  sample_link: string;
  motivation: string;
  status: AnalystApplicationStatus;
  rejection_reason: string | null;
  applied_at: string;
  reviewed_at: string | null;
};

export type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
};

export type AnalystProfileRow = {
  analyst_id: string;
  membership_enabled: boolean;
  membership_price_usd: number;
  membership_description: string | null;
  slug: string | null;
  tron_usdt_address: string | null;
  updated_at: string;
};

export type AnalystMembershipRow = {
  id: string;
  analyst_id: string;
  subscriber_user_id: string;
  started_at: string;
  cancelled_at: string | null;
  status: AnalystMembershipStatus;
  subscriber_profile?: Pick<ProfileRow, "username" | "avatar_url"> | null;
};

export type RevenueEventRow = {
  id: string;
  analyst_id: string;
  type: RevenueEventType;
  amount: number;
  source_user_id: string | null;
  created_at: string;
};

export type AnalystDashboardMetricBar = {
  label: string;
  views: number;
  comments: number;
  likes: number;
};

export type AnalystDashboardTopPost = {
  id: string;
  title: string;
  views: number;
  comments: number;
  likes: number;
  bookmarks: number;
  score: number;
};

export type AnalystDashboardSnapshot = {
  thisMonthRevenue: number;
  totalSubscribers: number;
  postsPublished: number;
  totalViews: number;
  uniqueViewers: number;
  totalComments: number;
  totalLikes: number;
  bullReactions: number;
  bearReactions: number;
  totalBookmarks: number;
  followerGrowth: number;
  analystScore: number;
  rankingPosition: number | null;
  revenueEstimate: number;
  revenueBars: Array<{ label: string; amount: number }>;
  engagementBars: AnalystDashboardMetricBar[];
  topPosts: AnalystDashboardTopPost[];
  memberships: AnalystMembershipRow[];
  profile: AnalystProfileRow | null;
  tronAddress: string | null;
};

export async function getSupabase() {
  return createServerClient();
}

export async function getCurrentUserContext() {
  const supabase = await getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user ?? null;

  if (!user) {
    return { supabase, user: null, profile: null as ProfileRow | null };
  }

  const profile = await ensureProfileRow(supabase, user.id, {
    username: getString(user.email) ?? null,
  });

  return { supabase, user, profile };
}

export async function ensureProfileRow(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  userId: string,
  input: { username: string | null },
): Promise<ProfileRow | null> {
  const { data: existing } = await supabase.from("profiles").select("id, username, avatar_url, role").eq("id", userId).maybeSingle();

  if (existing) {
    return existing as ProfileRow;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username: input.username,
      role: "user",
    })
    .select("id, username, avatar_url, role")
    .single();

  if (error) {
    return null;
  }

  return data as ProfileRow;
}

export async function getLatestApplicationForUser(userId: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("analyst_applications")
    .select(
      "id, user_id, full_name, twitter_handle, expertise_areas, experience_years, bio, sample_link, motivation, status, rejection_reason, applied_at, reviewed_at",
    )
    .eq("user_id", userId)
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as AnalystApplicationRow | null) ?? null;
}

export async function listAnalystApplicationsForAdmin() {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("analyst_applications")
    .select(
      "id, user_id, full_name, twitter_handle, expertise_areas, experience_years, bio, sample_link, motivation, status, rejection_reason, applied_at, reviewed_at",
    )
    .order("applied_at", { ascending: false });

  return (data ?? []) as AnalystApplicationRow[];
}

export async function getProfileById(userId: string) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, role")
    .eq("id", userId)
    .maybeSingle();

  return (data as ProfileRow | null) ?? null;
}

export async function getAnalystSettings(userId: string) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("analyst_profiles")
    .select("analyst_id, membership_enabled, membership_price_usd, membership_description, slug, tron_usdt_address, updated_at")
    .eq("analyst_id", userId)
    .maybeSingle();

  return (data as AnalystProfileRow | null) ?? null;
}

export async function upsertAnalystSettings(
  userId: string,
  input: {
    membershipEnabled: boolean;
    membershipPriceUsd: number;
    membershipDescription: string;
    slug?: string;
    tronUsdtAddress?: string;
  },
) {
  const supabase = await getSupabase();
  const row: Record<string, unknown> = {
    analyst_id: userId,
    membership_enabled: input.membershipEnabled,
    membership_price_usd: input.membershipPriceUsd,
    membership_description: input.membershipDescription,
    updated_at: new Date().toISOString(),
  };
  if (input.slug !== undefined) row.slug = input.slug;
  if (input.tronUsdtAddress !== undefined) row.tron_usdt_address = input.tronUsdtAddress;

  const { data } = await supabase
    .from("analyst_profiles")
    .upsert(row)
    .select("analyst_id, membership_enabled, membership_price_usd, membership_description, slug, tron_usdt_address, updated_at")
    .single();

  return data as AnalystProfileRow;
}

export async function approveAnalystApplication(applicationId: string) {
  const supabase = await getSupabase();
  const now = new Date().toISOString();

  const { data: application, error: fetchError } = await supabase
    .from("analyst_applications")
    .select("id, user_id, full_name")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!application) {
    return null;
  }

  const { error: applicationError } = await supabase
    .from("analyst_applications")
    .update({
      status: "approved",
      reviewed_at: now,
      rejection_reason: null,
    })
    .eq("id", applicationId);

  if (applicationError) {
    throw applicationError;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "verified_analyst" })
    .eq("id", application.user_id);

  if (profileError) {
    throw profileError;
  }

  await supabase.from("analyst_profiles").upsert({
    analyst_id: application.user_id,
    membership_enabled: false,
    membership_price_usd: 1,
    membership_description: "",
    updated_at: now,
  });

  return application;
}

export async function rejectAnalystApplication(applicationId: string, reason: string) {
  const supabase = await getSupabase();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("analyst_applications")
    .update({
      status: "rejected",
      reviewed_at: now,
      rejection_reason: reason,
    })
    .eq("id", applicationId);

  if (error) {
    throw error;
  }
}

export async function getApprovedAnalystProfile(userId: string) {
  const supabase = await getSupabase();
  const [profile, settings, latestApplication] = await Promise.all([
    getProfileById(userId),
    getAnalystSettings(userId),
    getLatestApplicationForUser(userId),
  ]);

  if (!profile || latestApplication?.status !== "approved") {
    return null;
  }

  return {
    profile,
    settings,
    latestApplication,
  };
}

export async function getAnalystDashboardSnapshot(userId: string): Promise<AnalystDashboardSnapshot> {
  const supabase = await getSupabase();
  const [settings, membershipsResult, revenueResult, postsResult, scoreResult, rankingsResult] = await Promise.all([
    getAnalystSettings(userId),
    supabase
      .from("analyst_memberships")
      .select("id, analyst_id, subscriber_user_id, started_at, cancelled_at, status")
      .eq("analyst_id", userId)
      .order("started_at", { ascending: false }),
    supabase
      .from("revenue_events")
      .select("id, analyst_id, type, amount, source_user_id, created_at")
      .eq("analyst_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select("id, title, view_count, created_at")
      .eq("author_id", userId)
      .eq("status", "published"),
    supabase
      .from("analyst_scores")
      .select("total_score")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("analyst_scores")
      .select("user_id, total_score")
      .order("total_score", { ascending: false }),
  ]);

  const memberships = (membershipsResult.data ?? []) as AnalystMembershipRow[];
  const revenueEvents = (revenueResult.data ?? []) as RevenueEventRow[];
  const posts = ((postsResult.data ?? []) as Array<{
    id: string;
    title: string;
    view_count: number | null;
    created_at: string;
  }>).map((post) => ({
    ...post,
    view_count: Number(post.view_count ?? 0),
  }));
  const postIds = posts.map((post) => post.id);
  const engagement = await getDashboardEngagement(postIds);
  const supabaseSubscriberCount = new Set(memberships.map((item) => item.subscriber_user_id)).size;
  const thisMonthRevenue = sumRevenueForCurrentMonth(revenueEvents);
  const revenueBars = buildRevenueBars(revenueEvents);
  const totalViews = Math.max(
    posts.reduce((sum, post) => sum + post.view_count, 0),
    engagement.views.length,
  );
  const activeSubscriberCount = memberships.filter((item) => item.status === "active").length;
  const analystScore =
    Number((scoreResult.data as { total_score?: number } | null)?.total_score) ||
    deriveAnalystScore({
      postsPublished: posts.length,
      totalViews,
      totalComments: engagement.comments.length,
      totalLikes: engagement.likes.length,
      totalBookmarks: engagement.bookmarks.length,
    });
  const rankingPosition = getRankingPosition(
    userId,
    analystScore,
    (rankingsResult.data ?? []) as Array<{ user_id: string; total_score: number }>,
  );

  // Count newsletter subscribers (slug-based system) via admin client if available
  let newsletterSubscriberCount = 0;
  if (settings?.slug && hasSupabaseAdminConfig()) {
    try {
      const admin = createAdminClient();
      const { count } = await admin
        .from("newsletter_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("analyst_id", settings.slug)
        .is("cancelled_at", null);
      newsletterSubscriberCount = count ?? 0;
    } catch { /* admin client unavailable */ }
  }

  const totalSubscribers = Math.max(supabaseSubscriberCount, newsletterSubscriberCount);
  const revenueEstimate = estimateMonthlyRevenue({
    revenueEvents,
    activeSubscriberCount: totalSubscribers,
    membershipPriceUsd: Number(settings?.membership_price_usd ?? 0),
  });
  const subscriberProfiles = await listSubscriberProfiles(
    memberships.map((item) => item.subscriber_user_id),
  );

  const nextMemberships = memberships.map((membership) => ({
    ...membership,
    subscriber_profile: subscriberProfiles[membership.subscriber_user_id] ?? null,
  }));

  return {
    thisMonthRevenue,
    totalSubscribers,
    postsPublished: posts.length,
    totalViews,
    uniqueViewers: countUniqueViewers(engagement.views),
    totalComments: engagement.comments.length,
    totalLikes: engagement.likes.length,
    bullReactions: engagement.reactions.filter((item) => item.reaction === "bull").length,
    bearReactions: engagement.reactions.filter((item) => item.reaction === "bear").length,
    totalBookmarks: engagement.bookmarks.length,
    followerGrowth: calculateFollowerGrowth(memberships),
    analystScore,
    rankingPosition,
    revenueEstimate,
    revenueBars,
    engagementBars: buildEngagementBars(posts, engagement),
    topPosts: buildTopPosts(posts, engagement),
    memberships: nextMemberships,
    profile: settings,
    tronAddress: settings?.tron_usdt_address ?? null,
  };
}

async function getDashboardEngagement(postIds: string[]) {
  if (!postIds.length) {
    return {
      views: [] as Array<{ post_id: string; viewer_id: string | null; session_id: string | null; viewed_at: string }>,
      likes: [] as Array<{ post_id: string; created_at: string }>,
      bookmarks: [] as Array<{ post_id: string; created_at: string }>,
      comments: [] as Array<{ post_id: string; created_at: string }>,
      reactions: [] as Array<{ post_id: string; reaction: "bull" | "bear"; created_at: string }>,
    };
  }

  const supabase = await getSupabase();
  const [viewsResult, likesResult, bookmarksResult, commentsResult, reactionsResult] = await Promise.all([
    supabase
      .from("post_views")
      .select("post_id, viewer_id, session_id, viewed_at")
      .in("post_id", postIds),
    supabase
      .from("post_likes")
      .select("post_id, created_at")
      .in("post_id", postIds),
    supabase
      .from("post_bookmarks")
      .select("post_id, created_at")
      .in("post_id", postIds),
    supabase
      .from("post_comments")
      .select("post_id, created_at")
      .in("post_id", postIds),
    supabase
      .from("post_reactions")
      .select("post_id, reaction, created_at")
      .in("post_id", postIds),
  ]);

  return {
    views: (viewsResult.data ?? []) as Array<{ post_id: string; viewer_id: string | null; session_id: string | null; viewed_at: string }>,
    likes: (likesResult.data ?? []) as Array<{ post_id: string; created_at: string }>,
    bookmarks: (bookmarksResult.data ?? []) as Array<{ post_id: string; created_at: string }>,
    comments: (commentsResult.data ?? []) as Array<{ post_id: string; created_at: string }>,
    reactions: (reactionsResult.data ?? []) as Array<{ post_id: string; reaction: "bull" | "bear"; created_at: string }>,
  };
}

async function listSubscriberProfiles(userIds: string[]) {
  if (!userIds.length) {
    return {} as Record<string, Pick<ProfileRow, "username" | "avatar_url">>;
  }

  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  return (data ?? []).reduce<Record<string, Pick<ProfileRow, "username" | "avatar_url">>>(
    (accumulator, item) => {
      accumulator[item.id] = {
        username: item.username,
        avatar_url: item.avatar_url,
      };
      return accumulator;
    },
    {},
  );
}

function sumRevenueForCurrentMonth(events: RevenueEventRow[]) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return events
    .filter((event) => new Date(event.created_at) >= monthStart)
    .reduce((sum, event) => sum + Number(event.amount), 0);
}

function buildRevenueBars(events: RevenueEventRow[]) {
  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    buckets.set(key, 0);
  }

  for (const event of events) {
    const date = new Date(event.created_at);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Number(event.amount));
    }
  }

  return Array.from(buckets.entries()).map(([key, amount]) => {
    const [year, month] = key.split("-").map(Number);
    const date = new Date(Date.UTC(year, month, 1));
    return {
      label: date.toLocaleDateString("en-US", { month: "short" }),
      amount,
    };
  });
}

function buildEngagementBars(
  posts: Array<{ id: string; view_count: number; created_at: string }>,
  engagement: Awaited<ReturnType<typeof getDashboardEngagement>>,
) {
  const buckets = createMonthBuckets<AnalystDashboardMetricBar>(() => ({
    label: "",
    views: 0,
    comments: 0,
    likes: 0,
  }));

  for (const post of posts) {
    const bucket = buckets.get(monthKey(post.created_at));
    if (bucket) bucket.views += post.view_count;
  }

  for (const view of engagement.views) {
    const bucket = buckets.get(monthKey(view.viewed_at));
    if (bucket) bucket.views += 1;
  }

  for (const comment of engagement.comments) {
    const bucket = buckets.get(monthKey(comment.created_at));
    if (bucket) bucket.comments += 1;
  }

  for (const like of engagement.likes) {
    const bucket = buckets.get(monthKey(like.created_at));
    if (bucket) bucket.likes += 1;
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    ...value,
    label: monthLabel(key),
  }));
}

function buildTopPosts(
  posts: Array<{ id: string; title: string; view_count: number }>,
  engagement: Awaited<ReturnType<typeof getDashboardEngagement>>,
) {
  return posts
    .map((post) => {
      const views = Math.max(
        post.view_count,
        engagement.views.filter((item) => item.post_id === post.id).length,
      );
      const comments = engagement.comments.filter((item) => item.post_id === post.id).length;
      const likes = engagement.likes.filter((item) => item.post_id === post.id).length;
      const bookmarks = engagement.bookmarks.filter((item) => item.post_id === post.id).length;
      const score = Math.round(views * 0.1 + comments * 3 + likes * 2 + bookmarks * 4);
      return { id: post.id, title: post.title, views, comments, likes, bookmarks, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function createMonthBuckets<T extends { label: string }>(factory: () => T) {
  const buckets = new Map<string, T>();
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.set(`${date.getUTCFullYear()}-${date.getUTCMonth()}`, factory());
  }
  return buckets;
}

function monthKey(value: string) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", { month: "short" });
}

function countUniqueViewers(
  views: Array<{ viewer_id: string | null; session_id: string | null; post_id: string }>,
) {
  const keys = new Set<string>();
  for (const view of views) {
    const viewerKey = view.viewer_id ? `user:${view.viewer_id}` : view.session_id ? `session:${view.session_id}` : null;
    if (viewerKey) keys.add(viewerKey);
  }
  return keys.size;
}

function calculateFollowerGrowth(memberships: AnalystMembershipRow[]) {
  const now = new Date();
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const current = memberships.filter((item) => new Date(item.started_at) >= currentStart).length;
  const previous = memberships.filter((item) => {
    const startedAt = new Date(item.started_at);
    return startedAt >= previousStart && startedAt < currentStart;
  }).length;

  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function deriveAnalystScore(input: {
  postsPublished: number;
  totalViews: number;
  totalComments: number;
  totalLikes: number;
  totalBookmarks: number;
}) {
  return Math.min(
    100,
    Math.round(
      input.postsPublished * 4 +
      input.totalViews * 0.04 +
      input.totalComments * 2 +
      input.totalLikes * 1.5 +
      input.totalBookmarks * 2,
    ),
  );
}

function getRankingPosition(
  userId: string,
  analystScore: number,
  rankings: Array<{ user_id: string; total_score: number }>,
) {
  const normalized = rankings.length
    ? rankings.map((item) => ({
        user_id: item.user_id,
        total_score: Number(item.total_score) || 0,
      }))
    : [{ user_id: userId, total_score: analystScore }];
  if (!normalized.some((item) => item.user_id === userId)) {
    normalized.push({ user_id: userId, total_score: analystScore });
  }
  normalized.sort((a, b) => b.total_score - a.total_score);
  const index = normalized.findIndex((item) => item.user_id === userId);
  return index >= 0 ? index + 1 : null;
}

function estimateMonthlyRevenue(input: {
  revenueEvents: RevenueEventRow[];
  activeSubscriberCount: number;
  membershipPriceUsd: number;
}) {
  const subscriptionEstimate = input.activeSubscriberCount * input.membershipPriceUsd * 0.7;
  return Math.max(subscriptionEstimate, sumRevenueForCurrentMonth(input.revenueEvents));
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
