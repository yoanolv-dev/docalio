// Service worker Docalio.
// Règle d'or : aucune donnée utilisateur n'est mise en cache (pages, fichiers,
// réponses Supabase). Seuls les fichiers statiques versionnés de l'application
// (/_next/static, empreinte dans le nom, immuables) et la page hors ligne le sont.
const VERSION = "v1";
const STATIC_CACHE = `docalio-static-${VERSION}`;
const SHELL_CACHE = `docalio-shell-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const SHELL = [OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, SHELL_CACHE]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Fichiers statiques versionnés : cache d'abord (démarrage instantané).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pages : toujours le réseau ; page hors ligne si la connexion est coupée.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          return preload || (await fetch(request));
        } catch {
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
  }
});
