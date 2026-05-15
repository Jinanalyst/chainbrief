self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const title = payload.title || "Chain Brief";
  const keyword = typeof payload.keyword === "string" ? payload.keyword.trim() : "";
  const options = {
    body: payload.body,
    tag: payload.tag,
    data: {
      url: payload.url || "/briefs",
      keyword,
    },
    badge: "/icon.svg",
    icon: "/icon.svg",
    renotify: Boolean(keyword),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/briefs";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
