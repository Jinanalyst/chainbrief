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
  }

  return NextResponse.redirect(redirectTo);
}
