const CACHE_NAME = "tienda-italy-mau-v4";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

// ================================
// INSTALACIÓN — VERSIÓN 4
// ================================
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const file of APP_FILES) {
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

      await self.skipWaiting();
    })()
  );
});

// ================================
// ACTIVACIÓN — ELIMINAR CACHÉS VIEJAS
// ================================
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

// ================================
// PETICIONES
// ================================
self.addEventListener("fetch", event => {
  const request = event.request;

  // Solo procesamos peticiones GET
  if (request.method !== "GET") {
    return;
  }

  // ================================
  // PÁGINAS / NAVEGACIÓN
  // ================================
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put("./index.html", copy);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        })
    );

    return;
  }

  // ================================
  // ARCHIVOS Y RECURSOS
  // ================================
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {

        // Si existe en caché, usarlo inmediatamente
        if (cachedResponse) {
          return cachedResponse;
        }

        // Si no existe, intentar Internet
        return fetch(request)
          .then(response => {

            if (
              response &&
              (
                response.ok ||
                response.type === "opaque"
              )
            ) {
              const copy = response.clone();

              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, copy);
              });
            }

            return response;
          })
          .catch(() => {

            // Si no hay Internet y tampoco está en caché
            return new Response("", {
              status: 503,
              statusText: "Offline"
            });

          });
      })
  );
});
