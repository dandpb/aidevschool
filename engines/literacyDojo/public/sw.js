// Service worker do PWA — Cache API nativa, sem workbox.
// Política por rota (AID-3453/F1+F2): ativos do Vite têm hash no nome, então
// cache-first é seguro para eles; URLs de caminho fixo (/escola/*, manifest,
// ícones) usam network-first com fallback de cache, para um controlador
// retornante atualizar no primeiro acesso online em vez de servir HTML novo
// com assets/contrato velhos indefinidamente. A navegação é network-first e
// cada documento é gravado sob a PRÓPRIA chave — só o documento do escopo
// renova o shell offline da raiz; /escola/ nunca sobrescreve o shell de "/".
// policy fix (AID-3453 rodada 18:14Z): leitura e escrita usam a MESMA chave
// normalizada (pathname) — /escola/?utm_source=test recarrega offline a
// partir do documento /escola/ em cache.
// AID-3563 (defeito reproduzido em AID-3556): o host serve fallback SPA
// (200 text/html) para qualquer path ausente sob o escopo. Sub-recursos NUNCA
// gravam resposta HTML no cache — só conteúdo genuíno do caminho — para não
// envenenar chaves de asset com o shell (offline passaria a servir HTML sob
// chave de asset). Documentos de navegação legítimos seguem no branch navigate
// (chave própria), que continua aceitando text/html.
// AID-3563 r2 (decisão de revisão 58ea31f2 / precisão PO dc48816b): a LEITURA
// também saneia — hit de sub-recurso que seja HTML nunca é servido; a entrada
// é removida (somente essa chave) e o fetch cai para a rede (cache-first) ou
// rejeita (offline). Sem bump de CACHE nesta r2: o formato do cache não mudou
// e um bump seria falsa prova de transição para o caminho de leitura.
// ponytail: bump manual do CACHE ao mudar este arquivo — se um dia o cache
// precisar de invalidação por deploy, gerar o nome no build.
const CACHE = "literacydojo-v6";
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

  // AID-3563: fallback SPA do host (200 text/html em path ausente) nunca é
  // gravado sob chave de asset — só conteúdo genuíno do caminho.
  const isSpaFallback = (response) => (response.headers.get("content-type") || "").includes("text/html");

  // AID-3563 r2: saneação de LEITURA delimitada. Devolve o hit de cache de
  // sub-recurso SOMENTE se não for HTML; se for, remove a entrada (apenas
  // essa chave — assets válidos, documentos de navegação e IndexedDB ficam
  // intocados) e devolve null: cache-first cai para a rede, network-first
  // rejeita offline em vez de servir o veneno. A guarda de escrita acima
  // continua impedindo o veneno NOVO; esta saneia o PREEXISTENTE.
  const subresourceHit = (key) =>
    caches.match(key, { cacheName: CACHE, ignoreVary: true }).then((hit) => {
      if (hit && isSpaFallback(hit)) {
        event.waitUntil(caches.open(CACHE).then((cache) => cache.delete(key)));
        return null;
      }
      return hit;
    });

  if (request.mode === "navigate") {
    // F1 (AID-3453): a resposta de navegação é gravada sob a própria chave
    // (o documento do escopo continua renovando o shell da raiz sob SCOPE).
    // Antes, toda navegação OK fazia keep(SCOPE, response) — visitar /escola/
    // sobrescrevia o shell offline de "/" com o HTML da escola, quebrando a
    // raiz offline. Offline: a MESMA chave normalizada (pathname) decide o
    // fallback — query strings não derrubam o documento em cache; só o
    // documento do escopo tem direito ao shell.
    const path = new URL(request.url).pathname;
    const documentKey = path === SCOPE ? SCOPE : path;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) keep(documentKey, response);
          return response;
        })
        .catch(() =>
          caches
            .match(documentKey, { cacheName: CACHE, ignoreVary: true })
            .then((hit) => hit ?? Response.error()),
        ),
    );
    return;
  }

  // F2 (AID-3453): política por rota para sub-recursos.
  if (path.startsWith(`${SCOPE}assets/`)) {
    // Imutável por construção (hash no nome do arquivo): cache-first. Hit
    // HTML envenenado (r2) é removido e a requisição cai para a rede.
    event.respondWith(
      subresourceHit(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok && !isSpaFallback(response)) keep(request, response);
            return response;
          }),
      ),
    );
    return;
  }
  // Caminho fixo (escola/*, manifest, ícones): network-first com fallback —
  // o controlador retornante atualiza no primeiro acesso online. r2: com a
  // rede vencendo, entrada HTML préexistente sob a chave é saneada; offline,
  // hit HTML é removido e rejeitado — nunca servido.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && !isSpaFallback(response)) keep(request, response);
        else event.waitUntil(subresourceHit(request));
        return response;
      })
      .catch(() => subresourceHit(request).then((hit) => hit ?? Response.error())),
  );
});
