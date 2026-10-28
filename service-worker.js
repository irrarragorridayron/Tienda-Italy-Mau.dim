const CACHE_NAME = "italy-mau-tienda-v15-offline";

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
      .then(async cache => {
        for (const file of APP_SHELL) {
          try {
            await cache.add(file);
          } catch (error) {
            console.warn(
              "No se pudo guardar en caché:",
              file,
              error
            );
          }
        }
      })
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

// SOLICITUDES Y FUNCIONAMIENTO OFFLINE
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // No interceptar peticiones a otros dominios.
  if (url.origin !== self.location.origin) return;

  // Página principal: primero red y luego caché.
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/")
  ) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);

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
        } catch (error) {
          const cached =
            await caches.match(request) ||
            await caches.match("./index.html") ||
            await caches.match("./");

          return cached || new Response(
            "La aplicación no está disponible en caché. Conéctate una vez a Internet para cargarla.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        }
      })()
    );

    return;
  }

  // Otros archivos: caché primero y red como alternativa.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response && response.ok) {
          const copy = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy))
          );
        }

        return response;
      } catch (error) {
        return new Response("Recurso no disponible sin conexión.", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      }
    })()
  );
});
