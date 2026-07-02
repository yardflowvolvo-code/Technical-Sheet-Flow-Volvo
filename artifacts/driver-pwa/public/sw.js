const CACHE_NAME = "yardflow-driver-v1";
const OFFLINE_URLS = ["/driver/", "/driver/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URLS[0])
      )
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Yardflow", body: "Atualização do pátio" };
  try {
    data = event.data?.json() ?? data;
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/driver/icon-192.png",
      badge: "/driver/icon-192.png",
      // Long, repeating pattern — the notification also stays on screen
      // (requireInteraction) until the driver dismisses or taps it.
      vibrate: [400, 150, 400, 150, 400, 150, 400],
      data: data,
      requireInteraction: true,
      // Same tag + renotify: if a second call comes in before the first
      // is acknowledged, it re-alerts (sound/vibration again) instead of
      // silently replacing the old one.
      tag: "yardflow-dock-call",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Tell any open tab to stop its in-app alarm sound.
      clients.forEach((client) => client.postMessage({ type: "yardflow:ack" }));
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow("/driver/");
      }
    })
  );
});
