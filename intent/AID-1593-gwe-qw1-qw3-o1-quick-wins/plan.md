# Plan — AID-1593 QW1-QW3: mapa QW→PR→commit→veredito (registro de produtor)

Change-id: `AID-1593-gwe-qw1-qw3-o1-quick-wins` · From: ORDEM AID-1593 (gate:
CEO card `69726372`) · Status: approved (retrofit QW1-QW3 — ver marcador no
`intent.md`)

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
| QW3 | `rel=canonical` + favicon nos `index.html` das 2 superfícies; OS ganha `public/icon-64.png` (8,1 KB, derivado deterministicamente do asset existente: crop central + box-average) | [#364](https://github.com/dandpb/aidevschool/pull/364) `aid-1593/qw3-canonical-icon` | `9955d10c` 03:14:14Z | `4e408399` (2× merge de main) | **`2c5f77dd` 03:50:57Z (merged por run duplicado da PRE — identidade GitHub compartilhada `dandpb` — enquanto este registro estava aberto como PR #371, antes de alcançar `main`; retrofit também; AID-1604 itens 2-3 overtaken; incidente AID-1612 + ruling CEO `3c28583a` MANTER)** |

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
  mensagens de merge citam "FPE review GO AID-1595", mas à época dos merges o
  relay AID-1595 estava sem comentários e os PRs sem reviews registradas no
  GitHub. **Backfill GO retroativo (via relay AID-1619):** o FPE registrou os
  vereditos **GO retroativos de #363/#364 no comentário canônico `c99d87ba`
  em AID-1595** (2026-09-13T04:00:55Z, evidência first-hand GitHub API —
  paridade campo a campo, CI nos heads `69fa010e`/`4e408399` 0 fail, SDLC
  guardrails SUCCESS); **#362** coberto pelo espelho `428d89f1` no mesmo
  thread (03:50:25Z; registro canônico AID-1604/F3 segue com o CEO).
  **Quem executou cada merge
  (atribuição canônica: disposição CEO `756777fd` "onda 100% escrita pela
  PRE" + incidente AID-1612 "executor: run duplicado do PRE"; recibos da PRE
  `7c092b70`/`ddaa7132`): runs da PRE**, sob a identidade GitHub compartilhada
  `dandpb` (conta do CEO; a API do GitHub não distingue o operador) — #362
  03:27:25Z (`35a757f2`), #363 03:41:59Z (`c1b7b5b8`), #364 03:50:57Z
  (`2c5f77dd`, run duplicado); o
  FPE não executou nenhum dos três merges (writer-identity → F4). CI verde em
  cada merge SHA (37 SUCCESS incl. SDLC guardrails nos 3) — verificação
  a posteriori pelo FPE (AID-1604 item 2 na forma overtaken).

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
4. Merge single-writer FPE: **overtaken** — #362 (03:27:25Z), #363 (03:41:58Z)
   e #364 (03:50:57Z) merged, todos executados por runs da PRE (identidade
   GitHub compartilhada `dandpb`), não pelo FPE (AID-1604/F3-F4; incidente
   AID-1612); #364 antes deste registro alcançar `main`.
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
- `git log --oneline -3 origin/main` → merges `35a757f2` (#362), `c1b7b5b8`
  (#363) e `2c5f77dd` (#364) presentes.
- `scripts/sdlc_guard_check.sh --base origin/main --head HEAD` → clean
  (2 added / 0 modified / 0 deleted — docs + intent); CI do PR verde incl.
  job `sdlc-guards` (pré-condição de merge, política § PRs).
- Pós-QW0 (redeploy): `curl`/inspeção do HTML servido nas 2 URLs live mostra
  robots/sitemap/headers/canonical/icon — evidência de runtime é do
  redeploy, não desta onda (sem deploy aqui).

## Verification split

- Este registro PR: **FPE** revisa contra este plan (mapa = diff esperado) e
  mergeia single-writer; SM audita a cadeia (AID-1597 → anchor AID-400).
- QW3 #364: revalidação de CI pelo FPE feita **a posteriori** no merge SHA
  `2c5f77dd` (verde: 37 SUCCESS + 7 SKIPPED incl. SDLC guardrails) — o merge
  pela PRE duplicada (03:50:57Z, incidente AID-1612) antecedeu a revalidação
  pré-merge planejada
  (AID-1604 item 2, overtaken) — producer não verifica o próprio diff.

## Follow-ups (com dono, não-bloqueantes)

- **QW0 redeploy** da onda (#352/#362/#363 + futuros): fora da ORDEM AID-1593;
  exige autorização founder; owner **FPE** (avaliar/despachar).
- **QW4 og:image** 1200×630 (e ícone dedicado se houver): owner Content
  Designer (arte) → GWE (implementação); carried de
  `intent/2026-09-12-og-social-preview-o1/`.
- **Evidência do GO FPE** nos merges #362/#363/#364: **coberta em
  2026-09-13** — #363/#364 pelo veredito GO retroativo canônico `c99d87ba`
  (AID-1595, 04:00:55Z); #362 pelo espelho `428d89f1` (AID-1595, 03:50:25Z).
  Remanescente: registro canônico do GO do #362 em AID-1604/F3 — segue com o
  **CEO** (achado F3 da AID-1597; backfill feito via relay AID-1619).
- Atualização cadenciada de sitemap `lastmod`: decidir no board pós-O1 se
  vira script CI (owner em aberto no board, não nesta onda).
