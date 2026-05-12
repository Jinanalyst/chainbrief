"use client";

import type { BriefPreferences } from "@/lib/preferences";
import type { PushPermissionState } from "@/lib/push";

export function getBrowserNotificationPermission(): PushPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }

  return window.Notification.requestPermission();
}

export function parseNotificationKeywords(value: string) {
  return value
    .split(/[,\n]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function formatNotificationKeywords(keywords: string[]) {
  return keywords.join("\n");
}

export function hasPushSupport() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function syncPushSubscription(preferences: BriefPreferences) {
  if (!hasPushSupport()) {
    return { ok: false, reason: "unsupported" } as const;
  }

  const permission = getBrowserNotificationPermission();
  if (permission !== "granted" || !preferences.notificationsEnabled) {
    await removePushSubscription();
    return { ok: false, reason: "permission" } as const;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { ok: false, reason: "missing_public_key" } as const;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      applicationServerKey: base64UrlToUint8Array(publicKey),
      userVisibleOnly: true,
    }));

  const response = await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      permission,
      keywords: preferences.notificationKeywords,
      language: preferences.language,
      enabled: preferences.notificationsEnabled,
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: "server_error" } as const;
  }

  return { ok: true } as const;
}

export async function removePushSubscription() {
  if (!hasPushSupport()) {
    return { ok: false, reason: "unsupported" } as const;
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();

  if (!subscription) {
    return { ok: true } as const;
  }

  await fetch("/api/notifications/subscribe", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
    }),
  });

  await subscription.unsubscribe();
  return { ok: true } as const;
}

export async function sendTestPushNotification() {
  const response = await fetch("/api/notifications/test", {
    method: "POST",
  });

  return response.ok;
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
