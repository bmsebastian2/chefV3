const CACHE = "getchef-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/", "/manifest.webmanifest", "/icon-192x192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Rutas de API y auth: siempre red
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (event.request.mode === "navigate") {
    // Navegación: intenta red, cae a /offline si falla
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  } else {
    // Assets: cache primero, luego red
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "GetChef";
  const options = {
    body: data.body || "Tienes una nueva notificación",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data ? event.notification.data.url : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url === url);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
