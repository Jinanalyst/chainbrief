"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ensureProfileRow,
  getApprovedAnalystProfile,
  getCurrentUserContext,
  getLatestApplicationForUser,
  approveAnalystApplication,
  rejectAnalystApplication,
  upsertAnalystSettings,
} from "@/lib/analyst-data";

const ANALYST_ALLOWED_TOPICS = new Set([
  "Bitcoin",
  "Ethereum",
  "Solana",
  "DeFi",
  "Macro",
  "Layer2",
]);

const ANALYST_ALLOWED_EXPERIENCE = new Set(["lt_1", "1_3", "3_5", "5_plus"]);

export async function submitAnalystApplicationAction(formData: FormData) {
  const { supabase, user } = await getCurrentUserContext();

  if (!user) {
    redirect("/login");
  }

  await ensureProfileRow(supabase, user.id, {
    username: getString(user.email) ?? null,
  });

  const fullName = requireString(formData.get("full_name"), "Full name is required.");
  const twitterHandle = optionalString(formData.get("twitter_handle"));
  const expertiseAreas = formData
    .getAll("expertise_areas")
    .map((item) => String(item))
    .filter((item): item is string => ANALYST_ALLOWED_TOPICS.has(item));
  const experienceYears = requireString(
    formData.get("experience_years"),
    "Experience is required.",
  ) as "lt_1" | "1_3" | "3_5" | "5_plus";
  const bio = requireString(formData.get("bio"), "Bio is required.").slice(0, 300);
  const sampleLink = requireString(formData.get("sample_link"), "Sample link is required.");
  const motivation = requireString(formData.get("motivation"), "Motivation is required.").slice(
    0,
    500,
  );

  if (!ANALYST_ALLOWED_EXPERIENCE.has(experienceYears)) {
    throw new Error("Invalid experience years.");
  }

  if (!expertiseAreas.length) {
    throw new Error("Select at least one expertise area.");
  }

  const latest = await getLatestApplicationForUser(user.id);
  if (latest?.status === "pending" || latest?.status === "approved") {
    redirect("/analyst/status");
  }

  if (latest?.status === "rejected") {
    const reapplyAt = new Date(latest.applied_at);
    reapplyAt.setDate(reapplyAt.getDate() + 30);
    if (new Date() < reapplyAt) {
      redirect("/analyst/status");
    }
  }

  const { error } = await supabase.from("analyst_applications").insert({
    user_id: user.id,
    full_name: fullName,
    twitter_handle: twitterHandle,
    expertise_areas: expertiseAreas,
    experience_years: experienceYears,
    bio,
    sample_link: sampleLink,
    motivation,
    status: "pending",
  });

  if (error) {
    throw error;
  }

  revalidatePath("/analyst/apply");
  revalidatePath("/analyst/status");
  redirect("/analyst/status");
}

export async function saveAnalystDashboardSettingsAction(formData: FormData) {
  const { user } = await getCurrentUserContext();

  if (!user) {
    redirect("/login");
  }

  const snapshot = await getApprovedAnalystProfile(user.id);
  if (!snapshot) {
    redirect("/analyst/apply");
  }

  const membershipEnabled = formData.get("membership_enabled") === "on";
  const membershipPriceUsd = Number(formData.get("membership_price_usd") ?? 0);
  const membershipDescription = requireString(
    formData.get("membership_description"),
    "Membership description is required.",
  ).slice(0, 500);

  if (!Number.isFinite(membershipPriceUsd) || membershipPriceUsd < 1 || membershipPriceUsd > 50) {
    throw new Error("Membership price must be between $1 and $50.");
  }

  await upsertAnalystSettings(user.id, {
    membershipEnabled,
    membershipPriceUsd,
    membershipDescription,
  });

  revalidatePath("/analyst/dashboard");
  redirect("/analyst/dashboard");
}

export async function approveAnalystApplicationAction(formData: FormData) {
  const { user, profile } = await getCurrentUserContext();

  if (!user) {
    redirect("/login");
  }

  if (profile?.role !== "admin") {
    redirect("/analyst/apply");
  }

  const applicationId = requireString(formData.get("application_id"), "Missing application id.");
  await approveAnalystApplication(applicationId);

  revalidatePath("/admin/analyst-applications");
  revalidatePath("/analyst/status");
  revalidatePath("/analyst/dashboard");
  redirect("/admin/analyst-applications");
}

export async function rejectAnalystApplicationAction(formData: FormData) {
  const { user, profile } = await getCurrentUserContext();

  if (!user) {
    redirect("/login");
  }

  if (profile?.role !== "admin") {
    redirect("/analyst/apply");
  }

  const applicationId = requireString(formData.get("application_id"), "Missing application id.");
  const reason = requireString(formData.get("rejection_reason"), "Rejection reason is required.");
  await rejectAnalystApplication(applicationId, reason);

  revalidatePath("/admin/analyst-applications");
  revalidatePath("/analyst/status");
  redirect("/admin/analyst-applications");
}

function requireString(value: FormDataEntryValue | null, message: string) {
  const result = optionalString(value);
  if (!result) {
    throw new Error(message);
  }
  return result;
}

function optionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
