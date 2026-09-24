const CACHE_NAME = "italy-mau-admin-offline-v8";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
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
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// FUNCIONAMIENTO OFFLINE
self.addEventListener("fetch", event => {
  const request = event.request;

  // Solo peticiones GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Solo archivos del mismo GitHub Pages
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cachedResponse => {

      // Si ya está guardado, usarlo inmediatamente
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está guardado, intentar obtenerlo de Internet
      return fetch(request)
        .then(response => {

          // Guardar automáticamente recursos nuevos
          if (response && response.ok) {
            const responseCopy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseCopy);
            });
          }

          return response;
        })
        .catch(() => {

          // Si estamos sin Internet y es una navegación,
          // abrir el index.html guardado
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return Response.error();
        });
    })
  );
});
