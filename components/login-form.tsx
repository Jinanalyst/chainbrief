"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

function isWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /FBAN|FBAV|Instagram|Line|KakaoTalk|NAVER|Snapchat|Twitter|MicroMessenger/i.test(ua) ||
    (/Android/.test(ua) && /wv/.test(ua)) ||
    (/iPhone|iPod|iPad/.test(ua) && !/Safari/.test(ua))
  );
}

export function LoginForm() {
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webView, setWebView] = useState(false);

  useEffect(() => {
    setWebView(isWebView());
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signInWithGoogle() {
    if (!supabase) return;

    setIsLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/community`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (authError) {
      setIsLoading(false);
      setError(authError.message);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
  }

  if (!hasSupabaseConfig) {
    return (
      <div className="rounded-md border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="text-sm font-semibold text-amber-100">
          Supabase environment variables are missing.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`,
          then restart the Next.js dev server.
        </p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="grid gap-4">
        <div className="rounded-md border border-accent/25 bg-accent/10 p-4">
          <p className="text-sm font-semibold text-ink">Signed in</p>
          <p className="mt-1 break-words text-sm text-muted">{user.email}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button href="/profile" variant="primary">
            Create profile
          </Button>
          <Button href="/community" variant="secondary">
            Community
          </Button>
          <Button disabled={isLoading} onClick={signOut} type="button" variant="secondary">
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (webView) {
    return (
      <div className="grid gap-4">
        <div className="rounded-md border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="text-sm font-semibold text-amber-100">Open in your browser to sign in</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Google sign-in is blocked inside in-app browsers (KakaoTalk, Instagram, Line, etc.).
            Please open this page in Chrome or Safari.
          </p>
        </div>
        <Button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open(window.location.href, "_blank");
            }
          }}
          type="button"
          variant="secondary"
        >
          Open in browser
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <Button
        disabled={isLoading}
        onClick={signInWithGoogle}
        type="button"
        variant="primary"
      >
        {isLoading ? "Redirecting..." : "Continue with Google"}
      </Button>

      {error ? <p className="text-sm leading-6 text-rose-300">{error}</p> : null}
    </div>
  );
}
