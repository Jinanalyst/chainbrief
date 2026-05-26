"use client";

import { useI18n, usePreferences } from "@/lib/i18n/use-i18n";

export function NotAuthorisedNotice({ email }: { email: string }) {
  const [preferences] = usePreferences();
  const { t } = useI18n(preferences.language);
  const i = t.insights;
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-tint/15 bg-tint/[0.04] p-8 text-center">
      <h1 className="text-xl font-bold text-ink">{i.studio.eyebrow}</h1>
      <p className="mt-3 text-sm text-muted">{i.studio.notAuthorised(email)}</p>
    </div>
  );
}
