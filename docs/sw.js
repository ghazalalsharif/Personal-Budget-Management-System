// Version the static cache when changing the offline asset set. User records stay in localStorage.
const CACHE = "zarf-static-v1";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./core.js",
  "./icon.svg",
  "./manifest.webmanifest",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("zarf-static-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  ),
);
// Prefer the network while online and fall back to cached app files when unavailable.
// Restrict interception to GET requests within this application scope.
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (
    e.request.method !== "GET" ||
    u.origin !== self.location.origin ||
    !u.href.startsWith(self.registration.scope)
  )
    return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() =>
        caches
          .match(e.request)
          .then(
            (r) =>
              r ||
              (e.request.mode === "navigate"
                ? caches.match("./index.html")
                : Response.error()),
          ),
      ),
  );
});
