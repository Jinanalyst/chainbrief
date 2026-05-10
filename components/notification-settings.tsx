"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import type { BriefPreferences } from "@/lib/preferences";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  formatNotificationKeywords,
  getBrowserNotificationPermission,
  parseNotificationKeywords,
  requestBrowserNotificationPermission,
} from "@/lib/notifications";

type NotificationSettingsProps = {
  preferences: BriefPreferences;
  onChange: (preferences: BriefPreferences) => void;
};

export function NotificationSettings({
  preferences,
  onChange,
}: NotificationSettingsProps) {
  const { t: copy } = useI18n(preferences.language);

  useEffect(() => {
    const permission = getBrowserNotificationPermission();

    if (permission !== preferences.notificationPermission) {
      onChange({ ...preferences, notificationPermission: permission });
    }
  }, [onChange, preferences]);

  async function toggleNotifications() {
    const nextEnabled = !preferences.notificationsEnabled;
    let permission = getBrowserNotificationPermission();

    if (nextEnabled && permission === "default") {
      permission = await requestBrowserNotificationPermission();
    }

    onChange({
      ...preferences,
      notificationsEnabled: nextEnabled && permission === "granted",
      notificationPermission: permission,
    });
  }

  function updateKeywords(value: string) {
    onChange({
      ...preferences,
      notificationKeywords: parseNotificationKeywords(value),
    });
  }

  const permissionStatus =
    copy.notifications.permissionLabels[preferences.notificationPermission];
  const isBlocked =
    preferences.notificationPermission === "denied" ||
    preferences.notificationPermission === "unsupported";

  return (
    <div className="mt-4 min-w-0 rounded-lg border border-white/10 bg-background/60 p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.notifications.title}
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-muted">
            {copy.notifications.description}
          </p>
        </div>
        <button
          aria-pressed={preferences.notificationsEnabled}
          className={cn(
            "flex min-h-8 w-14 shrink-0 items-center rounded-full border p-1 transition",
            preferences.notificationsEnabled
              ? "justify-end border-accent bg-accent"
              : "justify-start border-white/10 bg-white/[0.03]",
          )}
          disabled={preferences.notificationPermission === "unsupported"}
          onClick={toggleNotifications}
          type="button"
        >
          <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
        </button>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 text-sm md:grid-cols-2">
        <div className="min-w-0 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.notifications.enabledState}
          </p>
          <p className="mt-2 break-words font-semibold text-ink">
            {preferences.notificationsEnabled
              ? copy.notifications.enabled
              : copy.notifications.disabled}
          </p>
        </div>
        <div className="min-w-0 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.notifications.permissionStatus}
          </p>
          <p className="mt-2 break-words font-semibold text-ink">{permissionStatus}</p>
        </div>
      </div>

      <label className="mt-4 block min-w-0">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {copy.notifications.keywords}
        </span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-white/10 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
          onChange={(event) => updateKeywords(event.target.value)}
          placeholder={"Bitcoin ETF\nSolana\nSEC\nEthereum\nFed"}
          value={formatNotificationKeywords(preferences.notificationKeywords)}
        />
      </label>

      {preferences.notificationKeywords.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {preferences.notificationKeywords.map((keyword) => (
            <span
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted"
              key={keyword}
            >
              {keyword}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 break-words text-sm leading-6 text-muted-2">
          {copy.notifications.emptyKeywords}
        </p>
      )}

      {isBlocked ? (
        <p className="mt-3 break-words text-sm leading-6 text-muted-2">
          {copy.notifications.blockedHelp}
        </p>
      ) : null}
    </div>
  );
}
