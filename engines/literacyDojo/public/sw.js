// Service worker do PWA — Cache API nativa, sem workbox.
// Ativos do Vite têm hash no nome, então cache-first é seguro para eles; a
// navegação usa network-first com fallback para o shell do próprio escopo.
// ponytail: bump manual do CACHE ao mudar este arquivo — se um dia o cache
// precisar de invalidação por deploy, gerar o nome no build.
const CACHE = "literacydojo-v3";
const SCOPE = new URL("./", self.location.href).pathname;
const SHELL = [SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}icon-192.png`, `${SCOPE}icon-512.png`];

async function precacheShell() {
  const cache = await caches.open(CACHE);
  const shellResponse = await fetch(SCOPE);
  if (!shellResponse.ok) throw new Error(`shell fetch failed: ${shellResponse.status}`);
  await cache.put(SCOPE, shellResponse.clone());

  // Vite fingerprints JS/CSS filenames at build time. The service worker is a
  // static public asset, so discover those URLs from the built HTML instead of
  // hardcoding hashes. This also caches them on the first visit, before the new
  // worker controls the page's already-started asset requests.
  const html = await shellResponse.text();
  const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], new URL(SCOPE, self.location.origin)))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => `${url.pathname}${url.search}`);

  await cache.addAll([...new Set([...SHELL.slice(1), ...assetUrls])]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
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
          if (response.ok) keep(SCOPE, response);
          return response;
        })
        .catch(() => caches.match(SCOPE, { cacheName: CACHE }).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { cacheName: CACHE, ignoreVary: true }).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) keep(request, response);
          return response;
        }),
    ),
  );
});
