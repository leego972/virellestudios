/* Virelle Studios — Service Worker
 *
 * Strategy:
 *   - Precache the app shell so a cold offline open shows a Virelle splash
 *     instead of Chrome's dinosaur / Safari's blank page
 *   - Cache-first for hashed static assets (Vite emits content-hash filenames)
 *   - Network-first for navigations + API calls — we never want a stale page
 *     for a dynamic SPA, but we fall back to the offline shell if the network
 *     is dead
 *   - Auto-cleanup old cache versions on activate
 *
 * Bump CACHE_VERSION whenever app shell semantics change to force a refresh.
 */

const CACHE_VERSION = "v1.4.0";
const SHELL_CACHE = `virelle-shell-${CACHE_VERSION}`;
const ASSETS_CACHE = `virelle-assets-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const SHELL_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/apple-touch-icon.png",
  "/virelle-favicon-192.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(
              key =>
                key.startsWith("virelle-") &&
                key !== SHELL_CACHE &&
                key !== ASSETS_CACHE,
            )
            .map(key => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isHashedAsset(url) {
  if (!url.pathname.startsWith("/assets/")) return false;
  return /\.(js|css|woff2?|png|jpg|jpeg|webp|avif|svg|ico)$/.test(
    url.pathname,
  );
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/__vite")
  ) {
    return;
  }
  if (url.pathname.startsWith("/api/")) return;

  if (isHashedAsset(url)) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(cache =>
        cache.match(request).then(hit => {
          if (hit) return hit;
          return fetch(request)
            .then(response => {
              if (response.ok && response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => hit);
        }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then(
            response =>
              response || new Response("Offline", { status: 503 }),
          ),
      ),
    );
  }
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
