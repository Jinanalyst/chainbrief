"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";

export function Header() {
  const [preferences, setPreferences] = usePreferences();
  const { t: copy } = useI18n(preferences.language);

  function setLanguage(language: typeof preferences.language) {
    setPreferences({ ...preferences, language });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/86 backdrop-blur-xl">
      <Container className="flex items-center justify-between py-4">
        <BrandLogo compact priority />

        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
          <Link className="transition hover:text-ink" href="/">
            {copy.nav.home}
          </Link>
          <Link className="transition hover:text-ink" href="/briefs">
            {copy.nav.briefs}
          </Link>
          <Link className="transition hover:text-ink" href="/sns">
            {copy.nav.sns}
          </Link>
          <Link className="transition hover:text-ink" href="/settings">
            {copy.nav.settings}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 rounded-md border border-white/10 bg-white/[0.03] p-1">
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
          <Button className="hidden sm:inline-flex" href="/briefs" variant="secondary">
            {copy.nav.readBriefs}
          </Button>
        </div>
      </Container>
    </header>
  );
}
