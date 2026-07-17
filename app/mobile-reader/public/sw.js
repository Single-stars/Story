const CACHE_NAME = "story-reader-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_LIBRARY") {
    return;
  }

  event.waitUntil(
    fetch("./library.json", { cache: "reload" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Library request failed: ${response.status}`);
        }
        return caches.open(CACHE_NAME).then((cache) => cache.put("./library.json", response));
      })
      .then(() => event.source?.postMessage({ type: "CACHE_LIBRARY_RESULT", ok: true }))
      .catch((error) =>
        event.source?.postMessage({
          type: "CACHE_LIBRARY_RESULT",
          ok: false,
          message: error instanceof Error ? error.message : String(error)
        })
      )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html").then((response) => response || Response.error()))
    );
    return;
  }

  if (url.pathname.endsWith("/library.json")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((response) => response || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
