const CACHE_NAME = "inseldex-v12";

const CORE_DATEIEN = [
  "./",
  "./index.html",
  "./manifest.json",
  "./daten.js?v=2",
  "./moebele.js?v=30",
  "./fossil.js?v=1",
  "./musik.js?v=2"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_DATEIEN))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Externe Inhalte (z. B. Google Fonts) normal laden.
  if (url.origin !== self.location.origin) return;

  // HTML-Navigation immer zuerst aktuell aus dem Netz holen.
  // Falls offline, auf die gecachte Version zurückfallen.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Lokale Dateien: zuerst aus dem Cache, damit die App schnell startet.
  // Danach wird im Hintergrund die aktuelle Version aktualisiert.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
