<!-- issue: AID-3556 | key: aid3556-harness-receita | doc_id: 71e1e38a-4c7f-41dc-be74-ce07686585eb | updated: 2026-10-01 00:15:43.135+00 -->

# AID-3556 — Harness isolado: recibo/receita da reprodução do fallback de asset ausente no cache offline (SW v5 @ d9dbdd5c)

(AID-3556)

# AID-3556 — Run log / recibo (2026-09-30, Engine Systems)

## 1. Pinos (refs completas + hashes)

| Artefato | Ref | sha256 |
|---|---|---|
| `sw-base.js` (SW publicado) | `git show d9dbdd5c:engines/literacyDojo/public/sw.js` (merge PR #616, head `e95611da`) | `[REDACTED-HASH64]` (4919 B — bate com inventário AID-3524 §1) |
| `sw-fix.js` (variante de correção, fixture não publicada) | diff mínimo sobre sw-base (ver §5) | `[REDACTED-HASH64]` |
| `origin.mjs` (origem de fixture) | este dir | `[REDACTED-HASH64]` |
| `poison.spec.ts` | este dir | `[REDACTED-HASH64]` |
| `playwright.config.ts` | este dir | `[REDACTED-HASH64]` |
| runtime | node v24.18.0, playwright 1.62.0 (chromium bundled), 127.0.0.1:8791 | — |

Contrato da origem de fixture espelha a observação ao vivo AID-3524 §4: path ausente → **200 `text/html`, corpo = shell da raiz, etag igual ao de `/`** (`spa-fallback`), `x-content-type-options: nosniff` em todas as respostas (§3). Bytes da fixture ≠ produção (conteúdo sintético), mas o contrato vinculante ao SW (`response.ok` + content-type) é idêntico.

## 2. Como rodar (receita curta)

```bash
cd /paperclip/aid3556-evidence   # node_modules -> repo/engines/literacyDojo/node_modules
node_modules/.bin/playwright test --config playwright.config.ts
# logs: run/observations.jsonl (cache observado por cenário), run/origin-requests.jsonl (req/resp), run/results.json
```

## 3. Resultado: 6/6 passou (2026-09-30 ~20:1xZ, execução única, retries: 0)

| Cenário | Resultado | Observação central |
|---|---|---|
| base-A asset fixo existente online | PASS | chave `/escola/escola.css` gravada com CSS genuíno (sha `d7ae85ee…`) |
| **base-B asset ausente → fallback HTML (REPRODUÇÃO)** | **PASS = defeito confirmado** | resposta 200 `text/html`, etag = etag de `/`; chave `/escola/nao-existe.png` **presente** no cache `literacydojo-v5` com conteúdo = HTML do shell (sha `7616148d…` = sha do shell). `<img>` (no-cors) também envenena — e com query distinta (`?bust=…`) grava **segunda** chave envenenada (`keep(request)` inclui search no índice) |
| base-C navegação válida `/escola/` | PASS | documento sob a própria chave `/escola/`; shell `/` intacto (não sobrescrito) |
| base-D offline | PASS | fetch offline de `/escola/nao-existe.png` **resolve 200 `text/html` servindo o veneno do cache** (sha = shell); D2: navegação offline válida `/escola/` funciona (fallback ESPERADO, distinto do defeito) |
| base-N1 controle negativo REAL | PASS | 404 real: **não** gravado; offline rejeita (`Response.error`). Prova que as asserções distinguem gravado/não-gravado — se 404 fosse gravado ou offline resolvesse, o controle falharia e B/D seriam inválidos |
| fix-F variante com diff mínimo | PASS | mesma resposta de rede (200 html), chave do asset ausente **ausente** do cache; css legítimo ainda cacheado; offline rejeita; navegação offline `/escola/` preservada |

## 4. Veredito

**Defeito real do cache da aplicação, confirmado no código publicado (d9dbdd5c / SW v5 / `literacydojo-v5`).** O branch network-first de sub-recurso (caminho fixo e `/assets/*`) faz `keep()` de qualquer `response.ok`; com o fallback SPA do host (200 `text/html` para path ausente — observado ao vivo em AID-3524 §4), um asset ausente referenciado é gravado **sob chave de asset** e servido offline como 200 HTML. O fallback SPA do **host** em si não é o defeito (é comportamento esperado do Netlify `/* → /index.html 200`); o defeito é o cache da aplicação armazenar e servir esse HTML sob chave de asset (cópia offline envenenada; nosniff impede render como imagem, mas o SW entrega o conteúdo errado com status ok). A navegação offline válida (base-C/D2) usa branch distinto (documento sob a própria chave) e permanece correta.

## 5. Proposta mínima de correção (volta ao PO após revisão Storage)

Diff completo = `diff sw-base.js sw-fix.js` (2 guardas de 1 linha + helper, branch navigate intacto):

```js
const isSpaFallback = (r) => (r.headers.get("content-type") || "").includes("text/html");
// branch /assets/*  e branch caminho fixo:
if (response.ok && !isSpaFallback(response)) keep(request, response);
```

Em produção: bump `CACHE` → `literacydojo-v6` (regra do próprio sw.js; activate já limpa chaves antigas). Trade-off: sub-recurso HTML genuíno em caminho fixo deixaria de ser pré-cacheado (ainda serve online); não existe hoje no build (assets fixos = css/js/png/manifest).

**Critério base-falha/fix-passa** (demonstrado): invariante «nenhum HTML sob chave de asset; offline não serve veneno» — BASE: violada (base-B/D observam a violação); FIX: respeitada (fix-F). Controle negativo N1 garante que a asserção discrimina.

**Defesa em profundidade (dono host/engine, já registrada):** desmascarar 404 por extensão de asset na borda (AID-3524 §7.2) elimina a classe do problema na origem e habilita o monitor de uptime — complementar, não substituta.

## 6. Limites respeitados

Nenhum deploy/produção/cacheconfig/header/credencial/serviço/dado real tocado. Origem efêmera em `127.0.0.1:8791`, dados sintéticos, harness isolado neste dir, sem merge, sem filho de review, sem repetir suite de foco (#626) ou reabertura (#624) — verificação de equivalência: `tests/pwaRoute.test.ts` cobre só `serviceWorkerUrl()`; `playwright/pwa.spec.ts` é smoke offline; nenhum trabalho anterior reproduz chaves de asset envenenadas.

## 7. Próximo passo único

Revisão independente Storage (estágio nativo desta issue) sobre este recibo + `run/`; após `Approved`, a proposta mínima de correção (§5) segue ao PO para decisão de implementação (dependência: esta revisão).
