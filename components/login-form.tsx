"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type AuthMode = "signin" | "signup";

export function LoginForm() {
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

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

  async function submitEmailPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setError(null);

    const credentials = { email: email.trim(), password };
    const { error: authError } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({
            ...credentials,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=/community`,
            },
          });

    setIsLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setMessage(
      mode === "signin"
        ? "Signed in. You can return to your briefing feed."
        : "Account created. Check your email if Supabase asks for confirmation.",
    );
  }

  async function sendMagicLink() {
    if (!supabase || !email.trim()) {
      setError("Enter your email first.");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/community`,
      },
    });

    setIsLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setMessage("Magic link sent. Check your email to finish signing in.");
  }

  async function signInWithGoogle() {
    if (!supabase) {
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/community`,
      },
    });

    if (authError) {
      setIsLoading(false);
      setError(authError.message);
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
    setMessage("Signed out.");
  }

  if (!hasSupabaseConfig) {
    return (
      <div className="rounded-md border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="text-sm font-semibold text-amber-100">
          Supabase environment variables are missing.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`, then restart
          the Next.js dev server.
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

  return (
    <div className="grid gap-5">
      <Button
        disabled={isLoading}
        onClick={signInWithGoogle}
        type="button"
        variant="primary"
      >
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-2">
          or use email
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-2 rounded-md border border-white/10 bg-white/[0.03] p-1">
        {[
          { value: "signin", label: "Log in" },
          { value: "signup", label: "Create account" },
        ].map((item) => (
          <button
            aria-pressed={mode === item.value}
            className={
              mode === item.value
                ? "min-h-10 rounded bg-accent px-3 text-sm font-bold text-white"
                : "min-h-10 rounded px-3 text-sm font-bold text-muted transition hover:text-ink"
            }
            key={item.value}
            onClick={() => setMode(item.value as AuthMode)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <form className="grid gap-4" onSubmit={submitEmailPassword}>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Email
          </span>
          <input
            autoComplete="email"
            className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Password
          </span>
          <input
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            required
            type="password"
            value={password}
          />
        </label>

        <Button disabled={isLoading} type="submit">
          {isLoading ? "Working..." : mode === "signin" ? "Log in" : "Create account"}
        </Button>
      </form>

      <div className="grid gap-3 border-t border-white/10 pt-5">
        <Button disabled={isLoading} onClick={sendMagicLink} type="button" variant="secondary">
          Send magic link
        </Button>
      </div>

      {message ? <p className="text-sm leading-6 text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm leading-6 text-rose-300">{error}</p> : null}
    </div>
  );
}
