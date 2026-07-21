/* Virelle Studios — Service Worker
 *
 * Strategy:
 *   - Precache the app shell so a cold offline open shows a Virelle splash
 *   - Cache-first for hashed static assets
 *   - Network-first for navigations; API calls are never cached
 *   - Auto-cleanup old cache versions on activate
 */

const CACHE_VERSION = "v1.3.1";
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
            .filter(key => key.startsWith("virelle-") && key !== SHELL_CACHE && key !== ASSETS_CACHE)
            .map(key => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isHashedAsset(url) {
  if (!url.pathname.startsWith("/assets/")) return false;
  return /\.(js|css|woff2?|png|jpg|jpeg|webp|avif|svg|ico)$/.test(url.pathname);
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/@") || url.pathname.startsWith("/__vite")) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isHashedAsset(url)) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(cache =>
        cache.match(req).then(hit => {
          if (hit) return hit;
          return fetch(req)
            .then(res => {
              if (res.ok && res.status === 200) cache.put(req, res.clone());
              return res;
            })
            .catch(() => hit);
        }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then(response => response || new Response("Offline", { status: 503 })),
      ),
    );
  }
});

// Only a controlled same-origin page may activate a waiting service worker.
self.addEventListener("message", event => {
  if (!event.source || !event.data || event.data.type !== "SKIP_WAITING") return;
  try {
    const sourceUrl = new URL(event.source.url);
    if (sourceUrl.origin !== self.location.origin) return;
    self.skipWaiting();
  } catch {
    // Ignore malformed or non-window message sources.
  }
});
