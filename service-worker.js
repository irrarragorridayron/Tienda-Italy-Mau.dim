const CACHE_NAME = "italy-mau-tienda-v14-local-safe";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/logo-horizontal.png",
  "./assets/logo-tienda.png"
];

// INSTALACIÓN
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ACTIVACIÓN
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(
              key =>
                key.startsWith("italy-mau-tienda-") &&
                key !== CACHE_NAME
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// FUNCIONAMIENTO OFFLINE
self.addEventListener("fetch", event => {
  const request = event.request;

  // Solo procesar solicitudes GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // No interceptar solicitudes a otros dominios
  if (url.origin !== self.location.origin) return;

  // Páginas principales: intentar conexión y recurrir a la caché
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/")
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            event.waitUntil(
              caches.open(CACHE_NAME)
                .then(cache =>
                  cache.put("./index.html", copy)
                )
            );
          }

          return response;
        })
        .catch(async () => {
          const cached =
            await caches.match(request) ||
            await caches.match("./index.html") ||
            await caches.match("./");

          return cached || Response.error();
        })
    );

    return;
  }

  // Otros archivos: usar caché y descargar si no existen
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request)
          .then(response => {
            if (response && response.ok) {
              const copy = response.clone();

              event.waitUntil(
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, copy))
              );
            }

            return response;
          })
          .catch(() => Response.error());
      })
  );
});
