import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = requestUrl.searchParams.get("next") ?? "/community";
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.search = "";

  if (!hasSupabaseConfig) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "missing-config");
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await createClient();
  const result =
    code !== null
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : { error: new Error("Missing auth callback parameters.") };

  if (result.error) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "auth-callback");
  } else {
    // Heal the profile row on every sign-in so OAuth pictures (Google sets
    // `picture`, others use `avatar_url`) land in profiles.avatar_url. Without
    // this, community cards fall back to initials even after a successful login.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const pickStr = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
      const avatarUrl =
        pickStr(meta.avatar_url) ?? pickStr(meta.picture) ?? null;
      const username =
        pickStr(meta.username) ??
        pickStr(meta.preferred_username) ??
        pickStr(meta.name) ??
        pickStr(meta.full_name) ??
        (user.email ? user.email.split("@")[0] : `user_${user.id.slice(0, 8)}`);

      const { data: existing } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("profiles").insert({ id: user.id, username, avatar_url: avatarUrl });
      } else if (!existing.avatar_url && avatarUrl) {
        await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
      }

      // Route users who haven't completed analyst-profile onboarding into the
      // wizard. Honor an explicit ?next= only when onboarding is already done.
      const profile = meta.chainBriefProfile as Record<string, unknown> | undefined;
      const onboarded = Boolean(
        profile && typeof profile === "object" && typeof profile.onboardedAt === "string",
      );
      if (!onboarded) {
        redirectTo.pathname = "/onboarding";
      }
    }
  }

  return NextResponse.redirect(redirectTo);
}
