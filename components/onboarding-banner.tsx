"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { isOnboardingComplete, readProfile } from "@/lib/chainbrief-profile";

// Don't nag on auth-related routes or the wizard itself.
const EXEMPT_PREFIXES = ["/onboarding", "/auth", "/login"];
const DISMISS_KEY = "chainbrief.onboardingBanner.dismissed";

export function OnboardingBanner() {
  const pathname = usePathname();
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const [show, setShow] = useState(false);

  const exempt = EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!supabase || exempt) {
      setShow(false);
      return;
    }
    if (typeof window !== "undefined" && window.sessionStorage.getItem(DISMISS_KEY) === "1") {
      setShow(false);
      return;
    }

    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const user = data.user;
      if (!user) {
        setShow(false);
        return;
      }
      const profile = readProfile(user.user_metadata as Record<string, unknown> | undefined);
      setShow(!isOnboardingComplete(profile));
    });

    return () => {
      cancelled = true;
    };
  }, [exempt, supabase]);

  if (!show) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-accent/30 bg-gradient-to-r from-accent/15 via-accent/10 to-transparent backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <p className="min-w-0 text-sm text-ink">
          <span className="mr-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-ink">
            New
          </span>
          <span className="truncate">Finish your analyst profile so readers know who you are.</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/onboarding"
            className="rounded-md border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
          >
            Complete profile →
          </Link>
          <button
            type="button"
            onClick={() => {
              window.sessionStorage.setItem(DISMISS_KEY, "1");
              setShow(false);
            }}
            aria-label="Dismiss"
            className="rounded-md px-2 py-1.5 text-sm text-muted transition hover:text-ink"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
