/* sw.js — PWA sin “web vieja”
   - HTML/navigation: NETWORK FIRST (siempre intenta traer última)
   - Assets: CACHE FIRST
*/

const CACHE_VERSION = "v2026-01-23_01"; // <- CAMBIAR en cada publicación importante
const STATIC_CACHE = `static-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./LOGO%20VDS.jpeg",
  // Si tus íconos están en /icons, agregalos aquí (ajusta nombres reales):
  // "./icons/icon-192.png",
  // "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => (k.startsWith("static-") && k !== STATIC_CACHE) ? caches.delete(k) : null)
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1) NETWORK FIRST para navegación / HTML
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    url.pathname.endsWith(".html");

  if (isHTML) {
    event.respondWith((async () => {
      try {
        // no-store: fuerza ir a red, no al cache HTTP
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        // Offline / falla red: usar caché
        const cached = await caches.match(req);
        return cached || caches.match("./index.html");
      }
    })());
    return;
  }

  // 2) CACHE FIRST para assets (imagenes, etc.)
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    const fresh = await fetch(req);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});
