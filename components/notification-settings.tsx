"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  formatNotificationKeywords,
  getBrowserNotificationPermission,
  hasPushSupport,
  parseNotificationKeywords,
  removePushSubscription,
  requestBrowserNotificationPermission,
  sendTestPushNotification,
  syncPushSubscription,
} from "@/lib/notifications";
import type { BriefPreferences } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type NotificationSettingsProps = {
  preferences: BriefPreferences;
  onChange: (preferences: BriefPreferences) => void;
};

type StatusTone = "default" | "success" | "warning";

type NotificationStatusCopy = {
  copyAddress: string;
  copied: string;
  backgroundReady: string;
  browserUnsupported: string;
  loginRequired: string;
  missingConfig: string;
  permissionNeeded: string;
  saveHint: string;
  syncing: string;
  syncFailed: string;
  testButton: string;
  testFailed: string;
  testSending: string;
  testSuccess: string;
};

function getNotificationStatusCopy(
  language: BriefPreferences["language"],
): NotificationStatusCopy {
  if (language === "ko") {
    return {
      copyAddress: "주소 복사",
      copied: "복사됨!",
      backgroundReady: "브라우저가 닫혀 있어도 새 브리프를 백그라운드 푸시로 받을 준비가 됐어요.",
      browserUnsupported: "이 브라우저는 푸시 알림을 지원하지 않아요.",
      loginRequired: "백그라운드 브라우저 알림은 로그인한 계정에 연결돼요. 먼저 로그인해 주세요.",
      missingConfig: "푸시 알림 서버 설정이 아직 연결되지 않았어요. VAPID 환경변수를 먼저 넣어야 합니다.",
      permissionNeeded: "브라우저 알림 권한을 허용해야 푸시 구독을 만들 수 있어요.",
      saveHint: "키워드를 바꾸면 현재 기기 구독에도 바로 반영됩니다.",
      syncing: "현재 기기를 푸시 알림용으로 연결하는 중이에요...",
      syncFailed: "푸시 구독 저장에 실패했어요. 로그인 상태와 서버 설정을 다시 확인해 주세요.",
      testButton: "테스트 알림 보내기",
      testFailed: "테스트 알림을 보내지 못했어요. 구독 상태나 서버 로그를 확인해 주세요.",
      testSending: "테스트 알림을 보내는 중이에요...",
      testSuccess: "테스트 알림을 보냈어요. 몇 초 안에 브라우저에 표시되는지 확인해 주세요.",
    };
  }

  return {
    copyAddress: "Copy Address",
    copied: "Copied!",
    backgroundReady:
      "This device is ready for background browser push notifications, even when the feed tab is closed.",
    browserUnsupported: "This browser does not support push notifications.",
    loginRequired:
      "Background browser notifications are tied to a signed-in account. Please log in first.",
    missingConfig:
      "Push delivery is not fully configured yet. Add the VAPID environment variables first.",
    permissionNeeded:
      "Allow browser notification permission before creating a push subscription.",
    saveHint: "Keyword changes are synced to this device subscription automatically.",
    syncing: "Connecting this device for push notifications...",
    syncFailed:
      "We could not save the push subscription. Please check login state and server configuration.",
    testButton: "Send Test Notification",
    testFailed:
      "The test notification could not be sent. Please check the subscription state and server logs.",
    testSending: "Sending a test notification...",
    testSuccess:
      "Test notification sent. Check whether your browser shows it within a few seconds.",
  };
}

export function NotificationSettings({
  preferences,
  onChange,
}: NotificationSettingsProps) {
  const { t: copy } = useI18n(preferences.language);
  const statusCopy = getNotificationStatusCopy(preferences.language);
  const [user, setUser] = useState<User | null>(null);
  const preferencesRef = useRef(preferences);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>("default");
  const supabase = useMemo(() => (hasSupabaseConfig ? createClient() : null), []);
  const pushSupported = hasPushSupport();
  const hasPushPublicKey = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

  useEffect(() => {
    const permission = getBrowserNotificationPermission();

    if (permission !== preferences.notificationPermission) {
      onChange({ ...preferences, notificationPermission: permission });
    }
  }, [onChange, preferences]);

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

  preferencesRef.current = preferences;

  const notifSyncKey = [
    preferences.notificationsEnabled,
    preferences.notificationPermission,
    preferences.notificationKeywords.join("\x00"),
    preferences.language,
  ].join("|");

  useEffect(() => {
    const prefs = preferencesRef.current;

    if (!pushSupported || !user || !prefs.notificationsEnabled) {
      return;
    }

    if (prefs.notificationPermission !== "granted" || !hasPushPublicKey) {
      return;
    }

    let ignore = false;

    async function syncCurrentPreferences() {
      const result = await syncPushSubscription(preferencesRef.current);

      if (ignore) {
        return;
      }

      if (!result.ok && result.reason === "server_error") {
        setStatusTone("warning");
        setStatusMessage(statusCopy.syncFailed);
      }
    }

    void syncCurrentPreferences();

    return () => {
      ignore = true;
    };
  }, [hasPushPublicKey, notifSyncKey, pushSupported, statusCopy.syncFailed, user]);

  async function toggleNotifications() {
    const nextEnabled = !preferences.notificationsEnabled;
    let permission = getBrowserNotificationPermission();

    setStatusMessage(null);
    setStatusTone("default");

    if (!pushSupported) {
      onChange({
        ...preferences,
        notificationsEnabled: false,
        notificationPermission: "unsupported",
      });
      setStatusTone("warning");
      setStatusMessage(statusCopy.browserUnsupported);
      return;
    }

    if (nextEnabled && !user) {
      onChange({
        ...preferences,
        notificationsEnabled: false,
        notificationPermission: permission,
      });
      setStatusTone("warning");
      setStatusMessage(statusCopy.loginRequired);
      return;
    }

    if (nextEnabled && !hasPushPublicKey) {
      onChange({
        ...preferences,
        notificationsEnabled: false,
        notificationPermission: permission,
      });
      setStatusTone("warning");
      setStatusMessage(statusCopy.missingConfig);
      return;
    }

    if (nextEnabled && permission === "default") {
      permission = await requestBrowserNotificationPermission();
    }

    const nextPreferences = {
      ...preferences,
      notificationsEnabled: nextEnabled && permission === "granted",
      notificationPermission: permission,
    };

    onChange(nextPreferences);

    if (!nextEnabled) {
      setIsSyncing(true);
      await removePushSubscription();
      setIsSyncing(false);
      return;
    }

    if (permission !== "granted") {
      setStatusTone("warning");
      setStatusMessage(statusCopy.permissionNeeded);
      return;
    }

    setIsSyncing(true);
    setStatusTone("default");
    setStatusMessage(statusCopy.syncing);

    const result = await syncPushSubscription(nextPreferences);

    setIsSyncing(false);

    if (!result.ok) {
      setStatusTone("warning");
      setStatusMessage(
        result.reason === "missing_public_key"
          ? statusCopy.missingConfig
          : result.reason === "permission"
            ? statusCopy.permissionNeeded
            : statusCopy.syncFailed,
      );
      return;
    }

    setStatusTone("success");
    setStatusMessage(statusCopy.backgroundReady);
  }

  async function handleSendTest() {
    setIsSendingTest(true);
    setStatusTone("default");
    setStatusMessage(statusCopy.testSending);

    const sent = await sendTestPushNotification();

    setIsSendingTest(false);
    setStatusTone(sent ? "success" : "warning");
    setStatusMessage(sent ? statusCopy.testSuccess : statusCopy.testFailed);
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
  const accountLabel = user
    ? user.email ?? (preferences.language === "ko" ? "로그인됨" : "Signed in")
    : preferences.language === "ko"
      ? "로그인 후 백그라운드 푸시 사용 가능"
      : "Login required for background push";

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
          disabled={preferences.notificationPermission === "unsupported" || isSyncing}
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

      <div className="mt-4 grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {accountLabel}
          </p>
          <p className="mt-1 break-words text-xs leading-5 text-muted-2">
            {statusCopy.saveHint}
          </p>
        </div>
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-accent/30 bg-accent/10 px-3 text-xs font-semibold text-blue-100 transition hover:border-accent/50 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            !preferences.notificationsEnabled ||
            preferences.notificationPermission !== "granted" ||
            !user ||
            !hasPushPublicKey ||
            isSendingTest
          }
          onClick={handleSendTest}
          type="button"
        >
          {isSendingTest ? statusCopy.testSending : statusCopy.testButton}
        </button>
      </div>

      {statusMessage ? (
        <div
          className={cn(
            "mt-3 rounded-md border px-3 py-2 text-sm leading-6",
            statusTone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : statusTone === "warning"
                ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
                : "border-white/10 bg-white/[0.03] text-muted",
          )}
        >
          {statusMessage}
        </div>
      ) : null}

      {isBlocked ? (
        <p className="mt-3 break-words text-sm leading-6 text-muted-2">
          {copy.notifications.blockedHelp}
        </p>
      ) : null}
    </div>
  );
}
