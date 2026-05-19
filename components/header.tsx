"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export function Header() {
  const [preferences, setPreferences] = usePreferences();
  const { t: copy } = useI18n(preferences.language);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);

  const navItems = [
    { href: "/", label: copy.nav.home },
    { href: "/briefs", label: copy.nav.briefs },
    { href: "/community", label: copy.nav.community },
    { href: "/market", label: copy.nav.market },
    { href: "/analyst", label: copy.nav.analyst },
    { href: "/sns", label: copy.nav.sns },
    { href: "/settings", label: copy.nav.settings },
  ];

  function setLanguage(language: typeof preferences.language) {
    setPreferences({ ...preferences, language });
  }

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

  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    closeMenu();
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-tint/10 bg-background/86 backdrop-blur-xl">
      <Container className="flex min-w-0 items-center justify-between gap-3 py-3 sm:py-4">
        <BrandLogo compact priority className="max-w-[12rem] sm:max-w-none" />

        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
          {navItems.map((item) => (
            <Link className="transition hover:text-ink" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <div className="grid grid-cols-2 rounded-md border border-tint/10 bg-tint/[0.03] p-1">
            {[
              { value: "ko", label: "KR" },
              { value: "en", label: "EN" },
            ].map((item) => (
              <button
                aria-pressed={preferences.language === item.value}
                className={cn(
                  "min-h-8 rounded px-2.5 text-xs font-bold transition",
                  preferences.language === item.value
                    ? "bg-accent text-white"
                    : "text-muted hover:text-ink",
                )}
                key={item.value}
                onClick={() =>
                  setLanguage(item.value as typeof preferences.language)
                }
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Button className="max-w-36 truncate px-3" href="/dashboard" variant="secondary">
                {copy.nav.dashboard}
              </Button>
              <Button className="max-w-32 truncate px-3" onClick={signOut} type="button" variant="secondary">
                {copy.nav.signOut}
              </Button>
            </div>
          ) : (
            <Button className="hidden sm:inline-flex" href="/login" variant="secondary">
              {copy.nav.login}
            </Button>
          )}
          <button
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-tint/10 bg-tint/[0.04] text-ink transition hover:border-accent/50 md:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <span className="relative h-4 w-5">
              <span
                className={cn(
                  "absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition",
                  menuOpen && "top-1.5 rotate-45",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 top-1.5 h-0.5 w-5 rounded bg-current transition",
                  menuOpen && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 top-3 h-0.5 w-5 rounded bg-current transition",
                  menuOpen && "top-1.5 -rotate-45",
                )}
              />
            </span>
          </button>
        </div>
      </Container>

      <div
        className={cn(
          "grid overflow-hidden border-t border-tint/10 bg-background/96 transition-[grid-template-rows] duration-200 md:hidden",
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0">
          <Container className="py-3">
            <nav className="grid gap-2 text-sm font-semibold text-muted">
              {navItems.map((item) => (
                <Link
                  className="rounded-md border border-tint/10 bg-tint/[0.03] px-3 py-3 transition hover:text-ink"
                  href={item.href}
                  key={item.href}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              ))}
              {user ? (
                <div className="mt-1 grid gap-2">
                  <Button className="w-full" href="/dashboard" onClick={closeMenu} variant="secondary">
                    {copy.nav.dashboard}
                  </Button>
                  <Button className="w-full" onClick={signOut} type="button" variant="secondary">
                    {copy.nav.signOut}
                  </Button>
                </div>
              ) : (
                <Button className="mt-1 w-full" href="/login" onClick={closeMenu} variant="secondary">
                  {copy.nav.login}
                </Button>
              )}
            </nav>
          </Container>
        </div>
      </div>
    </header>
  );
}
