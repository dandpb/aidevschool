// Service worker do PWA — Cache API nativa, sem workbox.
// Política por rota (AID-3453/F1+F2): ativos do Vite têm hash no nome, então
// cache-first é seguro para eles; URLs de caminho fixo (/escola/*, manifest,
// ícones) usam network-first com fallback de cache, para um controlador
// retornante atualizar no primeiro acesso online em vez de servir HTML novo
// com assets/contrato velhos indefinidamente. A navegação é network-first e
// cada documento é gravado sob a PRÓPRIA chave — só o documento do escopo
// renova o shell offline da raiz; /escola/ nunca sobrescreve o shell de "/".
// ponytail: bump manual do CACHE ao mudar este arquivo — se um dia o cache
// precisar de invalidação por deploy, gerar o nome no build.
const CACHE = "literacydojo-v4";
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
  const path = new URL(request.url).pathname;

  // Guarda a resposta no cache; waitUntil segura o SW até a escrita terminar
  // (sem isso o worker pode ser encerrado e a gravação se perde).
  const keep = (key, response) => {
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then((cache) => cache.put(key, copy)));
  };

  if (request.mode === "navigate") {
    // F1 (AID-3453): a resposta de navegação é gravada sob a própria chave
    // (o documento do escopo continua renovando o shell da raiz sob SCOPE).
    // Antes, toda navegação OK fazia keep(SCOPE, response) — visitar /escola/
    // sobrescrevia o shell offline de "/" com o HTML da escola, quebrando a
    // raiz offline. Offline: serve a própria chave se existir; só o documento
    // do escopo tem direito ao fallback do shell.
    const documentKey = path === SCOPE ? SCOPE : path;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) keep(documentKey, response);
          return response;
        })
        .catch(() =>
          caches
            .match(request, { cacheName: CACHE, ignoreVary: true })
            .then((hit) => hit ?? (path === SCOPE ? caches.match(SCOPE, { cacheName: CACHE }) : undefined))
            .then((hit) => hit ?? Response.error()),
        ),
    );
    return;
  }

  // F2 (AID-3453): política por rota para sub-recursos.
  if (path.startsWith(`${SCOPE}assets/`)) {
    // Imutável por construção (hash no nome do arquivo): cache-first.
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
    return;
  }
  // Caminho fixo (escola/*, manifest, ícones): network-first com fallback —
  // o controlador retornante atualiza no primeiro acesso online.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) keep(request, response);
        return response;
      })
      .catch(() =>
        caches.match(request, { cacheName: CACHE, ignoreVary: true }).then((hit) => hit ?? Response.error()),
      ),
  );
});
