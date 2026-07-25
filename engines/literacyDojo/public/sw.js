// Service worker do PWA — Cache API nativa, sem workbox.
// Ativos do Vite têm hash no nome, então cache-first é seguro para eles; a
// navegação usa network-first com fallback para o shell "/" (offline).
// ponytail: bump manual do CACHE ao mudar este arquivo — se um dia o cache
// precisar de invalidação por deploy, gerar o nome no build.
const CACHE = "literacydojo-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // Guarda a resposta no cache; waitUntil segura o SW até a escrita terminar
  // (sem isso o worker pode ser encerrado e a gravação se perde).
  const keep = (key, response) => {
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then((cache) => cache.put(key, copy)));
  };

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Renova o shell offline: senão ele apontaria para sempre aos assets do build de instalação.
          if (response.ok) keep("/", response);
          return response;
        })
        .catch(() => caches.match("/", { cacheName: CACHE }).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { cacheName: CACHE }).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) keep(request, response);
          return response;
        }),
    ),
  );
});
