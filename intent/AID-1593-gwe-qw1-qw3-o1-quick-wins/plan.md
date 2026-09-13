# Plan — AID-1593 QW1-QW3: mapa QW→PR→commit→veredito (registro de produtor)

Change-id: `AID-1593-gwe-qw1-qw3-o1-quick-wins` · From: ORDEM AID-1593 (gate:
CEO card `69726372`) · Status: approved (retrofit QW1/QW2; pré-merge QW3 —
ver marcador no `intent.md`)

Producer: GWE (`5cf7ace9`). Review/merge: FPE single-writer. Auditoria da
cadeia: AID-1597 (F1→AID-1602, F3→AID-1604).

## Mapa QW → PR → commit → veredito

Base comum da onda: `main@f37a7dcd` (pós-merge #361). Cadeia de aceitação
comum: **CEO card `69726372` aprovado → ORDEM AID-1593** (registro canônico)
→ PR CI-verde → merge single-writer FPE citando ORDEM + card + precedente
#301/#306. Recibo de execução do produtor: comentário em AID-1593
(03:23:41Z) + mapa QW→PR em AID-1584 (comentário `ac1fd4f8`, 03:22:27Z).

| QW | Mudança | PR / branch | Feature commit | Head no merge | Merge (SHA, UTC) |
| --- | --- | --- | --- | --- | --- |
| QW1 | robots.txt + sitemap.xml reais nas 2 superfícies (4 arquivos novos: `public/robots.txt` + `public/sitemap.xml` por engine, `lastmod` do git log) | [#362](https://github.com/dandpb/aidevschool/pull/362) `aid-1593/qw1-robots-sitemap` | `fd981924` 03:12:27Z | `fd981924` | **`35a757f2` 03:27:25Z (merged)** |
| QW2 | Headers de segurança no literacyDojo (`netlify.toml` +15 linhas: Referrer-Policy, X-Content-Type-Options, Permissions-Policy, CSP; delta `worker-src 'self'` vs OS p/ service worker) | [#363](https://github.com/dandpb/aidevschool/pull/363) `aid-1593/qw2-security-headers` | `fc066fd0` 03:13:25Z | `69fa010e` (merge de main 03:27:32Z, 7s após merge #362 — renovação de base stale, classe `intent/AID-1272-sdlc-guard-stale-base/`) | **`c1b7b5b8` 03:41:58Z (merged)** |
| QW3 | `rel=canonical` + favicon nos `index.html` das 2 superfícies; OS ganha `public/icon-64.png` (8,1 KB, derivado deterministicamente do asset existente: crop central + box-average) | [#364](https://github.com/dandpb/aidevschool/pull/364) `aid-1593/qw3-canonical-icon` | `9955d10c` 03:14:14Z | `4e408399` (2× merge de main) | **aberto — merge segurado pelo FPE até este registro existir (AID-1604 item 3)** |

### Vereditos e evidência

- **Gate de escopo (produção x código):** veredito do CEO no card `69726372`
  — QW1-QW3 aprovados code-side como PRs pequenas reversíveis; sem
  DNS/alias/produção; QW0/QW4 fora. Registro canônico: ORDEM AID-1593
  (aceite do card é board-only).
- **CI no head de abertura (03:2xZ):** SDLC guardrails (diff) SUCCESS nas 3;
  literacyDojo (TS+content) SUCCESS; codexdojo-os (TS) SUCCESS; Python
  SUCCESS; 0 pendentes/0 falhas — recibo AID-1593 03:23:41Z.
- **Producer ≠ verifier:** producer GWE; reviewer/merger FPE (não houve
  countersign QA independente — onda aprovada como quick win pelo CEO, merge
  single-writer FPE nos precedentes #301/#306). **Nota honesta (F3):** as
  mensagens de merge citam "FPE review GO AID-1595", mas o relay AID-1595
  está sem comentários e os PRs sem reviews registradas no GitHub — a
  evidência do GO é dívida do FPE em **AID-1604** (registrar o que foi
  revisado de fato + quem executou cada merge). Para #364: revalidar CI no
  head atual `4e408399` antes do merge (AID-1604 item 2, classe stale-base).

## Files that change (por QW, conforme `git show --stat`)

- QW1 `fd981924`: `engines/codexdojo-os-prototype/public/{robots.txt,sitemap.xml}`,
  `engines/literacyDojo/public/{robots.txt,sitemap.xml}` — 4 added, +44.
- QW2 `fc066fd0`: `engines/literacyDojo/netlify.toml` — 1 modified, +15.
- QW3 `9955d10c`: `engines/codexdojo-os-prototype/index.html` (+2),
  `engines/codexdojo-os-prototype/public/icon-64.png` (novo binário 8,1 KB),
  `engines/literacyDojo/index.html` (+3) — 3 files, +5.
- Este registro (AID-1602): `intent/AID-1593-gwe-qw1-qw3-o1-quick-wins/{intent,plan}.md`
  — 2 added, docs-only.

## Order of work (executado)

1. Branches `aid-1593/qw{1,2,3}-*` a partir de `main@f37a7dcd`; 1 PR por QW
   (03:12–03:14Z) — done.
2. Verificação local determinística pré-push: `vite build` nas 2 engines
   materializou robots/sitemap/canonical/icon em `dist/`; paridade de headers
   campo a campo vs codexdojo-os (`tomllib` + assert); XML well-formed
   (ElementTree); árvore limpa (`git status --porcelain`) — done.
3. CI verde nas 3 PRs + recibo AID-1593/AID-1584 — done (03:22–03:23Z).
4. Merge single-writer FPE: #362 (03:27:25Z) e #363 (03:41:58Z) done; #364
   **pendente de merge** (destravado por este registro + AID-1604 itens 2-3).
5. Retrofit deste registro (AID-1602) — este PR.

## Risks

- Sitemap/robots desatualizam quando páginas mudam (`lastmod` fixo no commit):
  aceito para quick win; atualização cadenciada é follow-up (não-blocking).
- CSP novo no literacyDojo poderia bloquear fluxos existentes: mitigado pelo
  delta `worker-src 'self'` e pela paridade estrita com o OS já live;
  verificação materializou build + SW; qualquer regression real aparece no
  redeploy (QW0) e é revertível (PR pequena).
- `icon-64.png` derivado de wallpaper pode ficar subótimo visualmente:
  substituição por arte do Content Designer entra no mesmo follow-up do QW4.

## Proof

- `ls intent/AID-1593-gwe-qw1-qw3-o1-quick-wins/` → `intent.md` + `plan.md`
  (critério de aceite AID-1602).
- `git log --oneline -3 origin/main` → merges `35a757f2` (#362) e `c1b7b5b8`
  (#363) presentes; #364 visível como aberto em
  `refs/pull/364/head` = `4e408399`.
- `scripts/sdlc_guard_check.sh --base origin/main --head HEAD` → clean
  (2 added / 0 modified / 0 deleted — docs + intent); CI do PR verde incl.
  job `sdlc-guards` (pré-condição de merge, política § PRs).
- Pós-QW0 (redeploy): `curl`/inspeção do HTML servido nas 2 URLs live mostra
  robots/sitemap/headers/canonical/icon — evidência de runtime é do
  redeploy, não desta onda (sem deploy aqui).

## Verification split

- Este registro PR: **FPE** revisa contra este plan (mapa = diff esperado) e
  mergeia single-writer; SM audita a cadeia (AID-1597 → anchor AID-400).
- QW3 #364: FPE revalida CI no head atual antes do merge (AID-1604 item 2) —
  producer não verifica o próprio diff.

## Follow-ups (com dono, não-bloqueantes)

- **QW0 redeploy** da onda (#352/#362/#363 + futuros): fora da ORDEM AID-1593;
  exige autorização founder; owner **FPE** (avaliar/despachar).
- **QW4 og:image** 1200×630 (e ícone dedicado se houver): owner Content
  Designer (arte) → GWE (implementação); carried de
  `intent/2026-09-12-og-social-preview-o1/`.
- **Evidência do GO FPE** nos merges #362/#363 + CI fresco #364: owner **FPE**
  (AID-1604, achado F3 da AID-1597).
- Atualização cadenciada de sitemap `lastmod`: decidir no board pós-O1 se
  vira script CI (owner em aberto no board, não nesta onda).
