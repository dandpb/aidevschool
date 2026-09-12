# AID-306 — RELEASE.md — Promoção do pin contendo o fix de reflow AID-271 (7426d384)

**Data (UTC):** 2026-08-29 · **Executor:** CEO (501cb456), run c30751ba · **Status: SUPERSEDED por `3f641906` (AID-305, FPE) — que RETÉM `7426d384`**

## Decisão de execução (governança)

- Promoção executada na **linhagem de release** (pin → pin), sem merge em `main` e sem force-merge:
  a questão de governança `pr178_merge` (interação pendente `ask:AID-293:unblock-decisions:v1`)
  continua reservada ao dono humano. Precedente: AID-290 (`work-products/AID-293/AID-290-DECISION.md`).
- O branch do fix `aid-271/literacy-reflow-320` (`7426d384`) é **descendente direto do pin vigente**
  `29b59a92` (via `75c6cec7`) — fast-forward da linhagem, nada perdido (append-only respeitado).

## Execução (runbook AID-285 v2, a partir de `/paperclip/tmp/aid271/wt` @ 7426d384, tree limpa)

1. **Build determinístico** — `COMMIT_REF=7426d3843d8486bb2ce8a2f7f8ff4912e962850e npm run build:pilot`
   (4 missões bundled) + `node scripts/build-pilot-bundle.mjs` → bundle completo, **17/17 tooling** (`pilot-bundle-lib.test.mjs`).
   - `pilot-bundle-manifest.json`: `sourceRevision 7426d384…`, sha256 `0800b60a296047ec…7736`.
   - Nota de ambiente: `NODE_ENV=production` exportado pelo harness fazia npm omitir devDependencies
     (installs parciais); builds executados com `NODE_ENV=development`. Vite/mode não leem NODE_ENV →
     build idêntico ao de produção.
2. **Deploy draft** — `6a923a8baf4b5c8728e02574` (https://6a923a8baf4b5c8728e02574--aidevschool-codexdojo-os.netlify.app)
3. **Pre-check remoto do produtor — 15/15 PASS** no draft (script `/tmp/opencode/aid306-precheck.mjs`):
   identidade (manifest sha256 == build local; sourceRevision; superfícies), 5 superfícies 200,
   OS com pin same-origin `/apps/literacydojo/` (sem pin externo stale), CSS publicado do literacy
   **sem** pisos `min-width: 320px/330px/340px`, e **sonda reflow @320 com o predicado da QA**
   (viewport 320×640 → `/mission/ai-pratica/l01` → onboarding → dentro do iframe da missão:
   `docScrollW=298 <= innerW=298` em onboarding e pós-"Começar" — defeito era 320 > 298).
4. **Promoção produção** — `6a923b0407e78c7d193b8070` → alias https://aidevschool-codexdojo-os.netlify.app
   (mesmos bytes do draft verificado; sem rebuild).
5. **Pre-check no permalink de produção** — 15/15 PASS (idêntico ao draft).

## Supersessão (concorrência saudável, mesma noite)

Durante esta execução, o FPE (fa8130d5) promoveu em paralelo o re-pin da **AID-305**
(ponte de verificação Dev in-repo): `bbf27bb5` (01:52Z, retém `7426d384` + fix contraste AID-298) e
em seguida `3f641906` (01:54Z, "re-pin pilot lineage with the in-repo Dev verification bridge").
Verificado neste run:
- `git merge-base --is-ancestor 7426d384 bbf27bb5` = **verdadeiro**; `7426d384 ∈ 3f641906` = **verdadeiro**;
  `29b59a92` também ancestral (linhagem íntegra).
- Alias estável servindo `sourceRevision 3f641906…` (deploy `6a923bf25bc97ecfacfd3fed`).
- Re-execução do pre-check funcional contra o alias (servindo `3f641906`): **todas as checagens
  funcionais PASS**, incl. reflow @320 dentro do iframe (`298 <= 298`) e CSS sem pisos de largura.
  (As 3 checagens de identidade falham por design neste ponto: o alias não é mais o MEU build
  `7426d384`, e sim o re-pin superset — que o contém.)
- Ref pinada espelhada no origin: `refs/heads/release/bbf27bb5`; `3f641906` presente no clone do projeto.

## Rollback

O pin com o defeito `29b59a92` (deploy `6a9227f6…`) NÃO é rollback elegível (reintroduz o P1 AID-271).
Rollback, se a QA emitir NO-GO por outro motivo, deve mirar um deploy anterior verificado verde — nunca
o pin defeituoso.

## Estado e encadeamento

- AID-306: a entrega pedida ("pin promovido contendo `7426d384`") está satisfeita — primeiro pelo
  deploy direto deste run e, canonicalmente, pelo re-pin `3f641906` (AID-305) que o retém.
- AID-307 (QA ca6a3f95): re-executar a fatia AID-264 §3 @320 contra o **pin canônico vigente**
  (`3f641906`, conferir `sourceRevision` ao executar) — o prerequisito "pin contendo `7426d384`" está
  atendido e é auditável por ancestralidade no clone do projeto.
- AID-271: fecha `done` somente com o PASS independente da QA (producer ≠ verifier).
