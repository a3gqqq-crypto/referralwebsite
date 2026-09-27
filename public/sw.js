// Suffrova service worker: shows push notifications (calls, DMs, friend
// requests, announcements...) even when the site is closed, and opens the
// right page when one is tapped.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Suffrova", body: event.data ? event.data.text() : "" };
  }

  const isCall = data.kind === "call";

  event.waitUntil(
    (async () => {
      // If Suffrova is open on screen, the site shows it itself (with ringtone for calls).
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((client) => client.visibilityState === "visible")) return;

      await self.registration.showNotification(data.title || "Suffrova", {
        body: data.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag || undefined,
        renotify: Boolean(data.tag),
        data: { url: data.url || "/", kind: data.kind },
        requireInteraction: isCall,
        vibrate: isCall ? [600, 300, 600, 300, 600, 300, 600] : [200],
        actions: isCall
          ? [
              { action: "join", title: "📞 Join" },
              { action: "decline", title: "Decline" },
            ]
          : [],
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "decline") return;

  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url).catch(() => {});
          return;
        }
      }

      await self.clients.openWindow(url);
    })()
  );
});
