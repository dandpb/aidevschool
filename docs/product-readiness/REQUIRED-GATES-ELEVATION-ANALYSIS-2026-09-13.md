# Análise de elevação de gates a required — §5.3 (AID-1757)

**Data:** 2026-09-13 · **Autor:** Engine Systems Engineer (ORDEM carrier AID-1714/r7-C,
AID-1757) · **Tipo:** análise doc-only — **ZERO mudança em settings/branch protection**
(verificado por GET pré e pós: protection de `main` inalterada nesta onda, §9) ·
**Base:** main `a518d867` (pós-merges #391 `e1d10d54` / #394 `ab95bc90`) ·
**Expande:** anexo §5.3 de `REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md` (AID-1738 §5.1) ·
**Quadro de execução:** kit R1 (AID-1555, payload D + emenda B1) — qualquer elevação
cavalga o ratchet do kit; decisão e execução pertencem ao PRE/founder via despacho
próprio do carrier com gate apropriado.

## 1. Pergunta e resposta curta

**Pergunta (ORDEM):** elevar smoke/e2e de pixelDojo, miniTown, dojoToday (e a matriz
agregada de voxelDojo) a required — ou um meta-check de agregação barato — vale a pena?
O que elevar primeiro?

**Resposta curta:** sim para as 4 superfícies de browser como **contextos estáveis de
job raiz** — `pixelDojo (TS)`, `miniTown (TS)`, `dojoToday (TS + substrate)`,
`voxelDojo (TS)` — **nunca** os 16 contexts dinâmicos da matriz `voxelDojo
games/<id> (TS)`; se bloqueio por jogo for desejado no futuro, o veículo é um
meta-check de agregação (contexto único estável), onda 2 opcional. Custo marginal de
CI: **zero** (todos já rodam em todo PR e ficam abaixo do caminho crítico). O ganho
fecha um buraco de falso-verde real: hoje qualquer um desses jobs pode terminar
vermelho e o merge não é bloqueado (§4).

## 2. Estado atual (first-hand, 2026-09-13)

Branch protection de `main` (GET
`/repos/dandpb/aidevschool/branches/main/protection`):

- required contexts (4): `literacyDojo (TS + content)`, `codexdojo-os (TS)`,
  `Python (learner + curriculum shared)`, `product readiness (claims)`
- `strict=true`; `enforce_admins=true`; `dismiss_stale_reviews=true`;
  `required_approving_review_count=0`; `allow_force_pushes=true` (delta que o kit R1
  fecha — fora do escopo daqui)
- O kit R1 (doc `activation-kit` da AID-1555, payload D + emenda B1) já propõe o 5º
  required: `SDLC guardrails (diff)` — com a nota explícita de que "jobs
  skipped/literais da matrix ficam fora — ratchet por PR quando a matrix crescer".
  Esta análise fornece os dados para os passos seguintes do ratchet.

## 3. O que os candidatos já exercitam hoje (todo PR, `.github/workflows/ci.yml`)

| Contexto (check-run exato) | Conteúdo de smoke/e2e hoje |
|---|---|
| `pixelDojo (TS)` | lint/test/typecheck/build + `pnpm -r --if-present run smoke --retries=1 --trace on-first-retry` (recursivo: `pixel-quest` + qualquer `games/*`) + readiness-report → artifact `pixeldojo-readiness-<sha>` |
| `miniTown (TS)` | idem + Playwright smoke dedicado (`MINITOWN_PORT=5189`, `--retries=1`) + readiness-report |
| `dojoToday (TS + substrate)` | selfcheck + `test:readiness` = **Playwright suite completa** + readiness-report (`dojotoday-readiness-<sha>`) |
| `voxelDojo (TS)` (raiz) | lint/test workspace + suite `@aidevschool/evidence` (golden-rule primitivo) + typecheck/build + **varredura de smoke recursiva workspace-wide** (`pnpm -r smoke`, todo `game-*`) + readiness-report |
| `voxelDojo games/<id> (TS)` ×16 | matriz gerada de `catalog.json` (16 jogos hoje): lint/test/typecheck/build/**smoke por jogo** + traces flaky como artifact fora do padrão `*-readiness-<sha>` |

## 4. O buraco de sinal (por que "já roda em todo PR" não é "já bloqueia")

`product readiness (claims)` — o único required que depende dos produtores — declara
`needs: [literacydojo, codexdojo-os, dojotoday, pixeldojo, voxeldojo, minitown]` com
`if: always()`, e o gate explícito de completude (`assert producer reports present`,
ci.yml) falha apenas quando **zero** relatórios de produtor são baixados. Um único
produtor vermelho (ex.: `pixelDojo (TS)`) enquanto qualquer outro subir seu report
passa pelo assert; `check`/`enforce` avaliam staleness de claims **com reports em
mão**, não "todos os produtores verdes" (a distinção é do próprio comentário do step:
"Genuine staleness only ever fails `check`/`enforce` below **with producer reports in
hand**"). Consequência concreta: **uma regressão de browser em pixelDojo/miniTown/
dojoToday/voxelDojo pode ser mergeada com CI vermelho hoje** — os jobs não-required
não bloqueiam e o agregador não exige completude. Elevar os contexts raiz a required
transforma o bloqueio de implícito-condicional em explícito-direto.

## 5. Dados quantitativos (GitHub Actions API, first-hand)

Janela: **2026-09-13T03:52Z → 16:22Z**, 90 runs do workflow CI listadas; atribuição
por job em 82 runs (2 amostras: 24 recentes + 58 anteriores). Durações em minutos;
caminho crítico atual do CI = `codexdojo-os (TS)` (**já required**).

| Contexto | n | fail | med | p90 | max | ∆ tempo de merge se required |
|---|---|---|---|---|---|---|
| `pixelDojo (TS)` | 82 | **0** | 1,0 | 1,1 | 1,3 | 0 (1,0 < 4,7 crítico) |
| `miniTown (TS)` | 82 | **0** | 1,0 | 1,1 | 2,3 | 0 |
| `dojoToday (TS + substrate)` | 82 | **0** | 1,0 | 1,1 | 1,4 | 0 |
| `voxelDojo (TS)` (raiz) | 82 | **0** | 3,6 | 3,8 | 4,0 | 0 (4,0 < 4,7) |
| `voxelDojo games/<id> (TS)` (16×) | 82 cada | **0** | 0,9–1,1 | — | 1,8 | n/a (recomendado NÃO elevar) |
| `codexdojo-os (TS)` (referência, required) | 24 | 1 | 4,7 | 4,8 | 4,9 | — |
| `product readiness (claims)` (referência, required) | 24 | 1 | 0,7 | 0,7 | 0,7 | — |

Falhas na janela (honestidade de sinal/ruído): as 4 runs vermelhas do workflow foram
(i) 2 drills da fábrica de re-grant (`regrant/auto-20260913-*` — proposal-red **por
design**, §5.1); (ii) a tentativa 1 do AID-1738 (head `f5c82fc`) — regressão real de
integração **pega pelo `codexdojo-os (TS)` antes do merge** (bom sinal); (iii) 1 push
inicial do branch r3a que falhou só em `SDLC guardrails (diff)` (corrigido pré-merge).
**Zero falhas** em qualquer contexto candidato na janela — a política determinística
de retry (AID-571/AID-1658 R7: `--retries=1 --trace on-first-retry`, traces flaky
preservados em artifacts) tem segurado o ruído de browser.

## 6. Custo/benefício por contexto

| Contexto | Benefício (sinal) | Custo (CI) | Risco (ruído/falso-verde) | Leitura |
|---|---|---|---|---|
| `pixelDojo (TS)` | fecha o falso-verde do §4 na superfície learner-facing que carrega o contrato de evidência NDJSON do learning gate (PixelQuest `customer-ready` publicado) | zero (já roda; 1,0 min; fora do crítico) | flaky sob retry-1 com traces; 0 fail/82 | **elevar — onda 1** |
| `miniTown (TS)` | idem, superfície Level 0 (`minitown-explore-only` no inventory de readiness) | zero (1,0 min) | idem | **elevar — onda 1** |
| `dojoToday (TS + substrate)` | idem; carrega suite Playwright completa + `customer-ready` vigente | zero (1,0 min) | idem | **elevar — onda 1** |
| `voxelDojo (TS)` (raiz) | cobre **todos** os jogos de uma vez: varredura de smoke recursiva + suite `teaching-evidence`; nome estável (não muda com `catalog.json`) | zero (3,6 min; ainda < crítico 4,7) | 16 jogos numa lane só = pointer de falha menos fino (a matriz segue como diagnóstico não-bloqueante) | **elevar — onda 1** |
| `voxelDojo games/<id> (TS)` ×16 | pointer por jogo (unit/type/build por jogo além da raiz) | contexts escalam com `catalog.json`: **todo jogo novo/rename exigiria editar branch protection** senão quebra o ratchet (nota B1 do kit); smoke duplicado com a raiz | fragilidade estrutural de settings | **NÃO elevar (nunca crus)** |
| Meta-check agregado da matriz (novo job hipotético) | bloqueio por jogo sob **um** context estável (`needs: [voxeldojo-games]`, `if: always()`, vermelho se qualquer perna ≠ success) | +~0,5–1 min em lane paralela; +1 job ao workflow | degrau único de settings, uma vez | **onda 2 opcional** — só se regressões unit/build por jogo começarem a passar pela raiz; critério de disparo em §8 |

Defesa em profundidade (fora desta onda, exige despacho próprio porque muda workflow,
não settings): endurecer o step `assert producer reports present` para falhar com
**qualquer** produtor non-success (hoje: só zero reports). Com a elevação da onda 1
isso vira redundante para os 4 produtores browser, mas protegeria produtores futuros.

## 7. Recomendação acionável (o que elevar primeiro)

1. **Onda 1 (primeira elevação do ratchet pós-R1, junto ou logo após o payload D):**
   elevar a required, por nome exato de check-run, os 4 contexts:
   `pixelDojo (TS)` · `miniTown (TS)` · `dojoToday (TS + substrate)` ·
   `voxelDojo (TS)`. Custo marginal zero (dados §5), fecha o buraco do §4 para todas
   as superfícies de browser, e nenhum context depende de `catalog.json`.
2. **Nunca** requerer os 16 contexts `voxelDojo games/<id> (TS)` crus — a matriz é
   dinâmica por design (`catalog.json`) e required-por-jogo quebraria a cada jogo
   novo até editar protection (fragilidade que o kit B1 explicitamente evita).
3. **Onda 2 (opcional, critério em §8):** se bloqueio por jogo for desejado,
   criar meta-check agregado de contexto único e elevar **só ele**.
4. Execução: via kit R1 (emenda B1/payload D — mesmo veículo do 5º required
   `SDLC guardrails (diff)`), despacho do carrier AID-1714 com gate founder; este doc
   não executa nada.

## 8. Critérios de disparo da onda 2 (meta-check da matriz)

Elevar o meta-check somente se, após a onda 1: (a) uma regressão unit/typecheck/build
de `game-*` específico passar pelo smoke da raiz e alcançar main (raiz cobre smoke
de todos, mas unit/build por jogo só existem na matriz); ou (b) o catálogo estagnar
com falhas recorrentes no mesmo jogo que o smoke recursivo não capture. Até lá, a
matriz segue não-required como diagnóstico granular (gratuito: já roda).

## 9. Verificação de boundary (zero mudança em settings)

Nenhuma escrita em branch protection/settings/workflows nesta onda: o único GET de
protection citado (§2) é leitura; o diff deste PR é docs + intent somente. A
elevação, quando aprovada, é executada pelo dono do caminho (kit R1 / PRE / founder).

## 10. Fontes (reproduzíveis com credencial de leitura, 2026-09-13)

- `GET /repos/dandpb/aidevschool/branches/main/protection` (contexts required, flags).
- `GET /repos/dandpb/aidevschool/actions/workflows/ci.yml/runs` (páginas 1–3) +
  `GET /repos/dandpb/aidevschool/actions/runs/{id}/jobs` para as 82 runs com
  atribuição por job (amostras §5).
- `.github/workflows/ci.yml` @ `a518d867` (jobs, `needs`, `if: always()`, steps de
  smoke e `assert producer reports present`).
- `engines/voxelDojo/catalog.json` @ `a518d867` (16 jogos).
- `docs/product-readiness/REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md` §5 (anexo §5.3
  original); doc `activation-kit` da AID-1555 (payload D, emenda B1).
- Histórico: AID-571 (retry determinístico), AID-1658 R7 (extensão a
  pixel/voxel/miniTown), AID-1724 (mapa `ci-pipeline-map`, protection facts),
  AID-1738 §5.1 (drills proposal-red por design).
