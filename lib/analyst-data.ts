import { createClient as createServerClient } from "@/lib/supabase/server";

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

export type AnalystDashboardSnapshot = {
  thisMonthRevenue: number;
  totalSubscribers: number;
  postsPublished: number;
  revenueBars: Array<{ label: string; amount: number }>;
  memberships: AnalystMembershipRow[];
  profile: AnalystProfileRow | null;
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
    .select("analyst_id, membership_enabled, membership_price_usd, membership_description, updated_at")
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
  },
) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("analyst_profiles")
    .upsert({
      analyst_id: userId,
      membership_enabled: input.membershipEnabled,
      membership_price_usd: input.membershipPriceUsd,
      membership_description: input.membershipDescription,
      updated_at: new Date().toISOString(),
    })
    .select("analyst_id, membership_enabled, membership_price_usd, membership_description, updated_at")
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
  const [settings, membershipsResult, revenueResult, postsCountResult] = await Promise.all([
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
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .eq("status", "published"),
  ]);

  const memberships = (membershipsResult.data ?? []) as AnalystMembershipRow[];
  const revenueEvents = (revenueResult.data ?? []) as RevenueEventRow[];
  const activeSubscriberCount = new Set(memberships.map((item) => item.subscriber_user_id)).size;
  const thisMonthRevenue = sumRevenueForCurrentMonth(revenueEvents);
  const revenueBars = buildRevenueBars(revenueEvents);

  const subscriberProfiles = await listSubscriberProfiles(
    memberships.map((item) => item.subscriber_user_id),
  );

  const nextMemberships = memberships.map((membership) => ({
    ...membership,
    subscriber_profile: subscriberProfiles[membership.subscriber_user_id] ?? null,
  }));

  return {
    thisMonthRevenue,
    totalSubscribers: activeSubscriberCount,
    postsPublished: postsCountResult.count ?? 0,
    revenueBars,
    memberships: nextMemberships,
    profile: settings,
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

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
