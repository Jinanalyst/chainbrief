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
import {
  sendEmail,
  buildApprovalEmailHtml,
  buildRejectionEmailHtml,
} from "@/lib/email";
import { hasSupabaseAdminConfig, createAdminClient } from "@/lib/supabase/admin";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const ANALYST_ALLOWED_TOPICS = new Set([
  "Bitcoin",
  "Ethereum",
  "Solana",
  "DeFi",
  "Macro",
  "Layer2",
]);

const ANALYST_ALLOWED_EXPERIENCE = new Set(["lt_1", "1_3", "3_5", "5_plus"]);

export type ApplicationFormState = {
  error?: string;
  success?: boolean;
};

// Returns error state instead of throwing so the form can show the message.
export async function submitAnalystApplicationAction(
  _prevState: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  try {
    const { supabase, user } = await getCurrentUserContext();

    if (!user) {
      redirect("/login?next=/analyst/apply");
    }

    await ensureProfileRow(supabase, user.id, {
      username: getString(user.email) ?? null,
    });

    const fullName = optionalString(formData.get("full_name"));
    if (!fullName) return { error: "Full name is required." };

    const twitterHandle = optionalString(formData.get("twitter_handle"));
    const expertiseAreas = formData
      .getAll("expertise_areas")
      .map((item) => String(item))
      .filter((item) => ANALYST_ALLOWED_TOPICS.has(item));

    if (!expertiseAreas.length) {
      return { error: "Select at least one expertise area." };
    }

    const experienceYears = optionalString(formData.get("experience_years")) as
      | "lt_1"
      | "1_3"
      | "3_5"
      | "5_plus";

    if (!ANALYST_ALLOWED_EXPERIENCE.has(experienceYears)) {
      return { error: "Invalid experience years value." };
    }

    const bio = optionalString(formData.get("bio")).slice(0, 300);
    if (!bio) return { error: "Bio is required." };

    const sampleLink = optionalString(formData.get("sample_link"));
    if (!sampleLink) return { error: "Sample analysis link is required." };

    const motivation = optionalString(formData.get("motivation")).slice(0, 500);
    if (!motivation) return { error: "Motivation is required." };

    if (formData.get("disclaimer_agreed") !== "on") {
      return { error: "Please agree to the analyst content disclaimer." };
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

    const { data: newApp, error } = await supabase
      .from("analyst_applications")
      .insert({
        user_id: user.id,
        full_name: fullName,
        twitter_handle: twitterHandle || null,
        expertise_areas: expertiseAreas,
        experience_years: experienceYears,
        bio,
        sample_link: sampleLink,
        motivation,
        no_investment_advice_agreed: true,
        risk_disclosure_agreed: true,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      // Table may not exist yet — surface a friendly message instead of crashing
      if (error.code === "42P01") {
        return {
          error:
            "The analyst applications table hasn't been set up in the database yet. Please contact the admin.",
        };
      }
      return { error: error.message };
    }

    // Auto-approve immediately using the service-role client to bypass RLS
    if (newApp?.id && hasSupabaseAdminConfig()) {
      const adminClient = createAdminClient();
      const now = new Date().toISOString();
      await adminClient
        .from("analyst_applications")
        .update({ status: "approved", reviewed_at: now, rejection_reason: null })
        .eq("id", newApp.id);
      await adminClient
        .from("profiles")
        .update({ role: "verified_analyst" })
        .eq("id", user.id);
      await adminClient.from("analyst_profiles").upsert({
        analyst_id: user.id,
        membership_enabled: false,
        membership_price_usd: 1,
        membership_description: "",
        updated_at: now,
      });
    }

    revalidatePath("/analyst/apply");
    revalidatePath("/analyst/dashboard");
    redirect("/analyst/dashboard");
  } catch (err) {
    // redirect() throws internally in Next.js — let it propagate
    if (isRedirectError(err)) throw err;
    console.error("submitAnalystApplicationAction error:", err);
    return {
      error:
        "Something went wrong submitting your application. Please try again.",
    };
  }

  return { success: true };
}

export async function saveAnalystDashboardSettingsAction(formData: FormData) {
  try {
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
    const membershipDescription = optionalString(
      formData.get("membership_description"),
    ).slice(0, 500);

    if (
      !Number.isFinite(membershipPriceUsd) ||
      membershipPriceUsd < 1 ||
      membershipPriceUsd > 50
    ) {
      redirect("/analyst/dashboard?error=price");
    }

    await upsertAnalystSettings(user.id, {
      membershipEnabled,
      membershipPriceUsd,
      membershipDescription,
    });
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("saveAnalystDashboardSettingsAction error:", err);
    redirect("/analyst/dashboard?error=save");
  }

  revalidatePath("/analyst/dashboard");
  redirect("/analyst/dashboard?saved=1");
}

export async function approveAnalystApplicationAction(formData: FormData) {
  try {
    const { user, profile } = await getCurrentUserContext();

    if (!user) {
      redirect("/login");
    }

    if (profile?.role !== "admin") {
      redirect("/analyst/apply");
    }

    const applicationId = optionalString(formData.get("application_id"));
    if (!applicationId) redirect("/admin/analyst-applications");

    const result = await approveAnalystApplication(applicationId);

    // Send approval email to the analyst (best-effort, requires service role key)
    if (result && hasSupabaseAdminConfig()) {
      const adminClient = createAdminClient();
      const { data: authUser } = await adminClient.auth.admin
        .getUserById(result.user_id)
        .catch(() => ({ data: null }));
      const email = (authUser as { user?: { email?: string } } | null)?.user?.email;
      const fullName = (result as { full_name?: string }).full_name ?? "Analyst";
      if (email) {
        sendEmail({
          to: email,
          subject: "Your Chain Brief analyst application has been approved!",
          html: buildApprovalEmailHtml({
            fullName,
            dashboardUrl: `${BASE_URL}/analyst/dashboard`,
          }),
        }).catch(() => {});
      }
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("approveAnalystApplicationAction error:", err);
  }

  revalidatePath("/admin/analyst-applications");
  revalidatePath("/analyst/status");
  revalidatePath("/analyst/dashboard");
  redirect("/admin/analyst-applications");
}

export async function rejectAnalystApplicationAction(formData: FormData) {
  try {
    const { user, profile } = await getCurrentUserContext();

    if (!user) {
      redirect("/login");
    }

    if (profile?.role !== "admin") {
      redirect("/analyst/apply");
    }

    const applicationId = optionalString(formData.get("application_id"));
    const reason = optionalString(formData.get("rejection_reason"));
    if (!applicationId || !reason) redirect("/admin/analyst-applications");

    await rejectAnalystApplication(applicationId, reason);

    // Send rejection email to the analyst (best-effort, requires service role key)
    if (hasSupabaseAdminConfig()) {
      const adminClient = createAdminClient();
      const { data: rejectedApp } = await adminClient
        .from("analyst_applications")
        .select("user_id, full_name")
        .eq("id", applicationId)
        .maybeSingle();
      if (rejectedApp) {
        const { data: authUser } = await adminClient.auth.admin
          .getUserById((rejectedApp as { user_id: string }).user_id)
          .catch(() => ({ data: null }));
        const email = (authUser as { user?: { email?: string } } | null)?.user?.email;
        if (email) {
          sendEmail({
            to: email,
            subject: "Your Chain Brief analyst application update",
            html: buildRejectionEmailHtml({
              fullName: (rejectedApp as { full_name?: string }).full_name ?? "Analyst",
              reason,
              applyUrl: `${BASE_URL}/analyst/status`,
            }),
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("rejectAnalystApplicationAction error:", err);
  }

  revalidatePath("/admin/analyst-applications");
  revalidatePath("/analyst/status");
  redirect("/admin/analyst-applications");
}

// ── helpers ────────────────────────────────────────────────────────────────────

function optionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Next.js redirect() works by throwing a special error — don't swallow it. */
function isRedirectError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: string }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
