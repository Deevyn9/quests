// Quests service worker.
//
// What it keeps, and why:
//  - the offline page and the build's static files (scripts, fonts, icons): identical
//    for every user, so safe to share and cache
//  - one copy of the home page, so the app can open without a connection. It's
//    replaced on every online visit and deleted on sign-out (see CLEAR_PAGES), so a
//    shared device never shows the previous person's quests
//
// What it never touches: POSTs (saving changes), /api/ (sign-in), other websites.
const STATIC = "quests-static-v1";
const PAGES = "quests-pages-v1";
const OFFLINE_URL = "/offline.html";
const HOME = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.add(OFFLINE_URL))
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
            .filter((k) => k !== STATIC && k !== PAGES)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function saveHome(response) {
  if (response.ok && response.type === "basic" && !response.redirected) {
    const copy = response.clone();
    caches.open(PAGES).then((cache) => cache.put(HOME, copy));
  }
}

// The page talks to us in two cases:
//  - CLEAR_PAGES: the user signed out, forget the saved page
//  - CACHE_HOME: this was the first ever visit (the page loaded before this worker
//    existed, so we never saw it), so fetch and keep a copy now
self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "CLEAR_PAGES") {
    event.waitUntil(caches.delete(PAGES));
  } else if (type === "CACHE_HOME") {
    event.waitUntil(
      fetch(HOME)
        .then(saveHome)
        .catch(() => {}),
    );
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  );
}

function offlineFallback(url) {
  const savedHome =
    url.pathname === HOME
      ? caches.open(PAGES).then((c) => c.match(HOME))
      : Promise.resolve(null);
  return savedHome
    .then((hit) => hit || caches.open(STATIC).then((c) => c.match(OFFLINE_URL)))
    .then((hit) => hit || Response.error());
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (url.pathname === HOME) saveHome(response);
          return response;
        })
        .catch(() => offlineFallback(url)),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((response) => {
              if (response.status === 200) cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
  }
});
