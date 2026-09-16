# Análise §8 B1 onda 2 — meta-check agregado da matriz voxelDojo, pós-R1 (AID-1831)

**Data:** 2026-09-14 · **Autor:** Platform & Release Engineer (ORDEM AID-1830/A item 3, issue
AID-1831) · **Tipo:** análise doc-only — **ZERO mudança em settings/branch protection/repo
neste item** (o diff de repo desta onda cobre apenas os itens 1–2 da ORDEM) · **Base:** main
`e6999f0` (pós-ativação R1 completa) · **Expande:** `REQUIRED-GATES-ELEVATION-ANALYSIS-2026-09-13.md`
§7.3/§8 (AID-1757) e emenda B1 do kit R1 (AID-1555, PR #408) · **Pergunta da ORDEM:** avaliar
os critérios §8 contra a proteção vigente (9 required checks) e entregar proposta-ou-declínio
com evidência.

## 1. Resposta curta

**DECLÍNIO (por agora).** Nenhum dos dois critérios de disparo do §8 ocorreu na janela
observada; a onda 2 permanece **opcional e não-recomendada** neste ciclo, exatamente como o
kit R1 rev 2 deixou. Recomendação operacional: re-avaliar por gatilho (não por calendário),
com os dois tripwires §8 monitorados por dados de CI que esta análise deixa reproduzíveis.

## 2. Proteção vigente (first-hand, 2026-09-14)

`GET /repos/dandpb/aidevschool/branches/main/protection` → required contexts (9, idênticos ao
registro E3 `9e8a98f0`): `literacyDojo (TS + content)` · `codexdojo-os (TS)` · `Python (learner +
curriculum shared)` · `product readiness (claims)` · `SDLC guardrails (diff)` · `pixelDojo (TS)`
· `miniTown (TS)` · `dojoToday (TS + substrate)` · **`voxelDojo (TS)`**. A raiz voxelDojo
(required) roda lint/test workspace + suite evidence + typecheck/build + **smoke recursivo
workspace-wide** (`pnpm -r smoke`, todo `game-*`); a matriz `voxelDojo games/<id> (TS)`
(16 contexts dinâmicos via `catalog.json` + job `voxelDojo games (discover)`) segue
**não-required** por design da emenda B1.

## 3. Evidência contra o critério (a) — "regressão unit/typecheck/build de game-* passa o
smoke da raiz e alcança main"

Varredura first-hand via GitHub Actions API (janela **2026-08-29 → 2026-09-14**, 700 runs do
`ci.yml`: 491 PR + 209 push):

- **Pushes em `main` com run vermelha: 20.** Jobs falhos nessas runs, por nome:
  `product readiness (claims)` ×4 · `SDLC guardrails (diff)` ×3 · `codexdojo-os (TS)` ×2 ·
  `literacyDojo (TS + content)` ×1 — **zero** pernas `voxelDojo games/<id> (TS)`; a raiz
  `voxelDojo (TS)` nunca falhou num push pós-split dos jobs (as 11 runs de ago-29 sem o job
  raiz precedem o layout atual).
- **Runs de PR vermelhas: 145** (o universo onde uma perna vermelha poderia ter aparecido):
  142 continham pernas da matriz e **todas as 2.272 execuções de perna
  `voxelDojo games/<id> (TS)` terminaram `success`** — nem flake.
- Ou seja: o buraco teórico do §4 da análise AID-1757 existe (unit/typecheck/build por jogo
  não bloqueiam), mas **zero eventos** o exerceram na janela — incluindo o período de
  ativação da R1 e a onda de hardening R1–R10.

## 4. Evidência contra o critério (b) — "catálogo estagnar com falhas recorrentes no mesmo
jogo que o smoke recursivo não capture"

- `catalog.json`: 16 jogos, última mudança `faa0074` (2026-08-17) — estável, porém o critério
  exige **falhas recorrentes no mesmo jogo** além da estagnação; com 0 falhas de perna na
  janela (§3), o critério não tem substrato.
- Catalogação por jogo na janela: nenhuma perna com conclusão ≠ success (idem §3).

## 5. Custo/benefício do meta-check se fosse ligado hoje

| Fator | Valor |
| --- | --- |
| Ganho de bloqueio | Nulo na prática: nenhuma regressão de perna escapou; smoke por jogo já é bloqueado pela raiz required |
| Custo | +1 job e +~0,5–1 min em lane paralela (estimativa AID-1757 §6); +1 superfície de falso-verde possível (flake de perna viraria bloqueio de merge — o oposto do problema AID-571) |
| Risco de não-fazer | Baixo e vigilável: os dois tripwires §8 são detectáveis nos dados de CI em qualquer re-avaliação |

## 6. Recomendação

1. **Declinar a onda 2 neste ciclo** — sem proposta de settings; a emenda B1 fica como está.
2. **Manter os tripwires §8 como gatilho objetivo** (não calendário): re-avaliar quando
   (a) uma perna `voxelDojo games/<id>` ficar vermelha em run cuja raiz `voxelDojo (TS)`
   ficou verde e o commit alcançou main, ou (b) o catálogo estagnado exibir falhas
   recorrentes no mesmo jogo. Método de verificação reproduzível: §§3–4 acima (Actions API:
   runs do `ci.yml` + jobs por run; classificação por nome de job).
3. Se um tripwire disparar, o veículo permanece o da AID-1757 §7.4: meta-check de contexto
   único estável (`needs: [voxeldojo-games]`, `if: always()`), elevado **só ele** — nunca os
   contexts dinâmicos crus.

## 7. Boundary

Nenhuma escrita em branch protection/settings/workflows por este item: apenas GETs de leitura
(protection, runs, jobs) e leitura de `catalog.json`/`ci.yml` no pin base. O diff de repo da
onda AID-1831 (itens 1–2 da ORDEM) é disjunto desta análise.

## 8. Fontes (reproduzíveis, 2026-09-14)

- `GET /repos/dandpb/aidevschool/branches/main/protection` (9 contexts, flags).
- `GET /repos/dandpb/aidevschool/actions/workflows/ci.yml/runs?per_page=100` páginas 1–7
  (700 runs, 2026-08-29→2026-09-14) + `GET …/actions/runs/{id}/jobs?per_page=100` para as
  165 runs vermelhas (20 push + 145 PR) e para a run mais recente (contagem de pernas).
- `engines/voxelDojo/catalog.json` @ `e6999f0` (16 jogos) + histórico (`faa0074`, 2026-08-17).
- `.github/workflows/ci.yml` @ `e6999f0` (jobs voxelDojo raiz/matriz/discover).
- `docs/product-readiness/REQUIRED-GATES-ELEVATION-ANALYSIS-2026-09-13.md` §6–§8 (AID-1757);
  `docs/serving/R1-REVIEW-MERGE-POLICY.md` §3 emenda B1 (AID-1555).
