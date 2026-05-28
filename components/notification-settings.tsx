"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/cn";
import {
  getBrowserNotificationPermission,
  hasPushSupport,
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

const copy = {
  ko: {
    title: "브라우저 알림",
    description:
      "뉴스 브리프, 속보, 커뮤니티 글, 크리에이터 피드(SNS/RSS)의 제목과 내용에서 키워드가 감지되면 Chrome 푸시 알림과 앱 팝업으로 알려드립니다.",
    enabledState: "상태",
    enabled: "활성화",
    disabled: "비활성화",
    permissionStatus: "권한 상태",
    permissionLabels: {
      default: "요청 전",
      denied: "거부됨",
      granted: "허용됨",
      unsupported: "지원 안 됨",
    },
    keywords: "알림 키워드",
    placeholder: "키워드 입력 후 Enter",
    add: "추가",
    emptyKeywords: "키워드를 줄바꿈 또는 쉼표로 추가하세요.",
    sound: "소리 알림",
    soundOn: "켜짐",
    soundOff: "꺼짐",
    accountFallback: "로그인하면 백그라운드 푸시 알림을 받을 수 있습니다.",
    saveHint: "키워드와 알림 설정은 현재 기기와 로그인 계정에 바로 반영됩니다.",
    backgroundReady: "이 기기에서 백그라운드 브라우저 푸시 알림을 받을 준비가 됐습니다.",
    browserUnsupported: "이 브라우저는 푸시 알림을 지원하지 않습니다.",
    loginRequired: "백그라운드 브라우저 푸시는 로그인한 계정에 연결됩니다. 먼저 로그인해주세요.",
    missingConfig: "푸시 서버 설정이 아직 연결되지 않았습니다. VAPID 환경 변수를 확인해주세요.",
    permissionNeeded: "브라우저 알림 권한을 허용해야 푸시 구독을 만들 수 있습니다.",
    syncing: "현재 기기를 푸시 알림에 연결하는 중입니다...",
    syncFailed: "푸시 구독 저장에 실패했습니다. 로그인 상태와 서버 설정을 확인해주세요.",
    testButton: "테스트 알림 보내기",
    testSending: "테스트 알림을 보내는 중입니다...",
    testSuccess: "테스트 알림을 보냈습니다. 몇 초 안에 브라우저 알림을 확인해주세요.",
    testFailed: "테스트 알림을 보내지 못했습니다. 구독 상태와 서버 로그를 확인해주세요.",
    blockedHelp: "브라우저에서 알림 권한이 차단되어 있으면 사이트 설정에서 다시 허용해주세요.",
  },
  en: {
    title: "Browser Notifications",
    description:
      "Get Chrome push notifications and in-app popups when keywords appear in news briefs, breaking items, community posts, and the creators feed (SNS/RSS).",
    enabledState: "State",
    enabled: "Enabled",
    disabled: "Disabled",
    permissionStatus: "Permission",
    permissionLabels: {
      default: "Not requested",
      denied: "Denied",
      granted: "Granted",
      unsupported: "Unsupported",
    },
    keywords: "Alert Keywords",
    placeholder: "Type a keyword, press Enter",
    add: "Add",
    emptyKeywords: "Add keywords separated by new lines or commas.",
    sound: "Sound",
    soundOn: "On",
    soundOff: "Off",
    accountFallback: "Log in to receive background push notifications.",
    saveHint: "Keyword and notification settings sync to this device and your account immediately.",
    backgroundReady: "This device is ready for background browser push notifications.",
    browserUnsupported: "This browser does not support push notifications.",
    loginRequired: "Background browser push is tied to a signed-in account. Please log in first.",
    missingConfig: "Push delivery is not configured yet. Check the VAPID environment variables.",
    permissionNeeded: "Allow browser notification permission before creating a push subscription.",
    syncing: "Connecting this device for push notifications...",
    syncFailed: "We could not save the push subscription. Check login state and server configuration.",
    testButton: "Send Test Notification",
    testSending: "Sending a test notification...",
    testSuccess: "Test notification sent. Check whether your browser shows it within a few seconds.",
    testFailed: "The test notification could not be sent. Check the subscription state and server logs.",
    blockedHelp: "If notifications are blocked in the browser, re-enable permission from the site settings.",
  },
} as const;

export function NotificationSettings({
  preferences,
  onChange,
}: NotificationSettingsProps) {
  const text = copy[preferences.language];
  const [user, setUser] = useState<User | null>(null);
  const preferencesRef = useRef(preferences);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>("default");
  const [keywordInput, setKeywordInput] = useState("");
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
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const syncKey = [
    preferences.notificationsEnabled,
    preferences.notificationPermission,
    preferences.notificationKeywords.join("\x00"),
    preferences.language,
  ].join("|");

  useEffect(() => {
    const prefs = preferencesRef.current;

    if (!pushSupported || !user || !prefs.notificationsEnabled) return;
    if (prefs.notificationPermission !== "granted" || !hasPushPublicKey) return;

    let ignore = false;

    async function syncCurrentPreferences() {
      const result = await syncPushSubscription(preferencesRef.current);
      if (!ignore && !result.ok && result.reason === "server_error") {
        setStatusTone("warning");
        setStatusMessage(text.syncFailed);
      }
    }

    void syncCurrentPreferences();

    return () => {
      ignore = true;
    };
  }, [hasPushPublicKey, pushSupported, syncKey, text.syncFailed, user]);

  async function toggleNotifications() {
    const nextEnabled = !preferences.notificationsEnabled;
    let permission = getBrowserNotificationPermission();

    setStatusMessage(null);
    setStatusTone("default");

    if (!pushSupported) {
      onChange({ ...preferences, notificationsEnabled: false, notificationPermission: "unsupported" });
      setStatusTone("warning");
      setStatusMessage(text.browserUnsupported);
      return;
    }

    if (nextEnabled && !user) {
      onChange({ ...preferences, notificationsEnabled: false, notificationPermission: permission });
      setStatusTone("warning");
      setStatusMessage(text.loginRequired);
      return;
    }

    if (nextEnabled && !hasPushPublicKey) {
      onChange({ ...preferences, notificationsEnabled: false, notificationPermission: permission });
      setStatusTone("warning");
      setStatusMessage(text.missingConfig);
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
      setStatusMessage(text.permissionNeeded);
      return;
    }

    setIsSyncing(true);
    setStatusMessage(text.syncing);
    const result = await syncPushSubscription(nextPreferences);
    setIsSyncing(false);

    if (!result.ok) {
      setStatusTone("warning");
      setStatusMessage(
        result.reason === "missing_public_key"
          ? text.missingConfig
          : result.reason === "permission"
            ? text.permissionNeeded
            : text.syncFailed,
      );
      return;
    }

    setStatusTone("success");
    setStatusMessage(text.backgroundReady);
  }

  async function handleSendTest() {
    const keywordForTest = preferences.notificationKeywords[0] ?? "";

    setIsSendingTest(true);
    setStatusTone("default");
    setStatusMessage(text.testSending);

    const result = await sendTestPushNotification(keywordForTest);

    setIsSendingTest(false);
    setStatusTone(result.ok ? "success" : "warning");
    setStatusMessage(
      result.ok
        ? text.testSuccess
        : result.detail
          ? `${text.testFailed} (${result.status}: ${result.detail})`
          : text.testFailed,
    );
  }

  function addKeyword() {
    const nextKeywords = keywordInput
      .split(/[,\n]/)
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .filter((keyword) => !preferences.notificationKeywords.includes(keyword));

    if (!nextKeywords.length) {
      setKeywordInput("");
      return;
    }

    onChange({
      ...preferences,
      notificationKeywords: [...preferences.notificationKeywords, ...nextKeywords].slice(0, 20),
    });
    setKeywordInput("");
  }

  function removeKeyword(keyword: string) {
    onChange({
      ...preferences,
      notificationKeywords: preferences.notificationKeywords.filter((item) => item !== keyword),
    });
  }

  function toggleSound() {
    onChange({
      ...preferences,
      notificationSoundEnabled: !preferences.notificationSoundEnabled,
    });
  }

  const permissionStatus = text.permissionLabels[preferences.notificationPermission];
  const isBlocked =
    preferences.notificationPermission === "denied" ||
    preferences.notificationPermission === "unsupported";
  const accountLabel = user?.email ?? text.accountFallback;

  return (
    <div className="mt-4 min-w-0 rounded-lg border border-tint/10 bg-background/60 p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {text.title}
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-muted">
            {text.description}
          </p>
        </div>
        <SwitchButton
          checked={preferences.notificationsEnabled}
          disabled={preferences.notificationPermission === "unsupported" || isSyncing}
          label={text.title}
          onClick={toggleNotifications}
        />
      </div>

      <div className="mt-4 grid min-w-0 gap-3 text-sm md:grid-cols-3">
        <StatusBox label={text.enabledState} value={preferences.notificationsEnabled ? text.enabled : text.disabled} />
        <StatusBox label={text.permissionStatus} value={permissionStatus} />
        <div className="min-w-0 rounded-md border border-tint/10 bg-tint/[0.03] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {text.sound}
              </p>
              <p className="mt-2 break-words font-semibold text-ink">
                {preferences.notificationSoundEnabled ? text.soundOn : text.soundOff}
              </p>
            </div>
            <SwitchButton
              checked={preferences.notificationSoundEnabled}
              label={text.sound}
              onClick={toggleSound}
              compact
            />
          </div>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {text.keywords}
        </p>
        <div className="mt-2 flex gap-2">
          <input
            className="min-h-10 flex-1 rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30"
            onChange={(event) => setKeywordInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addKeyword();
            }}
            placeholder={text.placeholder}
            value={keywordInput}
          />
          <button
            className="shrink-0 rounded-md border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-accent-ink transition hover:bg-accent/20 disabled:opacity-40"
            disabled={!keywordInput.trim()}
            onClick={addKeyword}
            type="button"
          >
            {text.add}
          </button>
        </div>

        {preferences.notificationKeywords.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {preferences.notificationKeywords.map((keyword) => (
              <span
                className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 py-1 pl-3 pr-2 text-xs font-medium text-accent-ink"
                key={keyword}
              >
                {keyword}
                <button
                  aria-label={`Remove ${keyword}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-accent-ink transition hover:bg-tint/10"
                  onClick={() => removeKeyword(keyword)}
                  type="button"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 break-words text-sm leading-6 text-muted-2">
            {text.emptyKeywords}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-3 rounded-md border border-tint/10 bg-tint/[0.03] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{accountLabel}</p>
          <p className="mt-1 break-words text-xs leading-5 text-muted-2">
            {text.saveHint}
          </p>
        </div>
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-accent/30 bg-accent/10 px-3 text-xs font-semibold text-accent-ink transition hover:border-accent/50 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
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
          {isSendingTest ? text.testSending : text.testButton}
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
                : "border-tint/10 bg-tint/[0.03] text-muted",
          )}
        >
          {statusMessage}
        </div>
      ) : null}

      {isBlocked ? (
        <p className="mt-3 break-words text-sm leading-6 text-muted-2">
          {text.blockedHelp}
        </p>
      ) : null}
    </div>
  );
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-tint/10 bg-tint/[0.03] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 break-words font-semibold text-ink">{value}</p>
    </div>
  );
}

function SwitchButton({
  checked,
  compact,
  disabled,
  label,
  onClick,
}: {
  checked: boolean;
  compact?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={checked}
      className={cn(
        "flex shrink-0 items-center rounded-full border p-1 transition",
        compact ? "min-h-7 w-12" : "min-h-8 w-14",
        checked
          ? "justify-end border-accent bg-accent"
          : "justify-start border-tint/10 bg-tint/[0.03]",
        disabled && "cursor-not-allowed opacity-50",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className={cn("rounded-full bg-white shadow-sm", compact ? "h-4 w-4" : "h-5 w-5")} />
    </button>
  );
}
