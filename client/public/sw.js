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

const CACHE_VERSION = "v1.2.0";
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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("virelle-") && k !== SHELL_CACHE && k !== ASSETS_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Cache only Vite-emitted lightweight static assets. Video / audio is excluded
// because a single mp4 can blow past Cache Storage quota and silently break
// the SW for the entire origin.
function isHashedAsset(url) {
  if (!url.pathname.startsWith("/assets/")) return false;
  return /\.(js|css|woff2?|png|jpg|jpeg|webp|avif|svg|ico)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Don't intercept cross-origin requests, dev HMR, websockets, or analytics
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/@") || url.pathname.startsWith("/__vite")) return;
  if (url.pathname.startsWith("/api/")) {
    // Network-first for API; do not cache (would serve stale auth/data)
    return;
  }

  // Cache-first for hashed static assets
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          if (hit) return hit;
          return fetch(req)
            .then((res) => {
              if (res.ok && res.status === 200) cache.put(req, res.clone());
              return res;
            })
            .catch(() => hit);
        })
      )
    );
    return;
  }

  // Navigation requests: network-first, fall back to offline shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || new Response("Offline", { status: 503 })))
    );
    return;
  }
});

// Allow the page to ask the SW to update itself ("New version available, refresh?")
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
