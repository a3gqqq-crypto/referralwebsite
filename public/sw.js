// Suffrova service worker: shows push notifications (calls, DMs, friend
// requests, announcements...) even when the site is closed, and opens the
// right page when one is tapped.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Pages always come from the network; with no connection, show a friendly
// offline screen instead of the browser's error page.
const OFFLINE_PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Suffrova</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#140d16;color:#fff1f5;font-family:system-ui,sans-serif;text-align:center;padding:24px}
.s{width:72px;height:72px;border-radius:20px;margin:0 auto 18px;display:grid;place-items:center;background:linear-gradient(100deg,#ff4d8d,#ff7a5c,#ff9f3d);font-size:40px;font-weight:800}
p{color:#d3bcc9}button{margin-top:14px;padding:12px 24px;border:0;border-radius:999px;background:linear-gradient(100deg,#ff4d8d,#ff9f3d);color:#fff;font-weight:700;font-size:16px}</style></head>
<body><div><div class="s">S</div><h1>You're offline</h1><p>Check your internet connection, then try again.</p><button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    )
  );
});

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
