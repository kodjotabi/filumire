/*
 * FILUMIRE service worker, layer 1: installable app shell.
 *
 * What it does:
 *  - keeps the app's own static files (scripts, styles, fonts,
 *    icons, small images) so repeat visits use less data;
 *  - shows a friendly offline page when a screen cannot load.
 *
 * What it deliberately does NOT do:
 *  - it never touches /api/ requests, so learner evidence, mastery
 *    and sign-in always come from the server;
 *  - it never stores page HTML, so one learner's screens are never
 *    kept for the next person using the same phone.
 */

// Refresh the precached offline page after fixing its French visibility rules.
const VERSION = "filumire-shell-v2";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const RUNTIME_LIMIT = 80;

const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/filumire-logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("filumire-shell-") &&
                key !== STATIC_CACHE &&
                key !== RUNTIME_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/")
  );
}

function isRuntimeAsset(pathname) {
  return pathname.startsWith("/images/");
}

async function trimCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  for (let index = 0; index < keys.length - limit; index += 1) {
    await cache.delete(keys[index]);
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }

  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const refresh = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        await trimCache(RUNTIME_CACHE, RUNTIME_LIMIT);
      }

      return response;
    })
    .catch(() => cached);

  return cached || refresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isRuntimeAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
