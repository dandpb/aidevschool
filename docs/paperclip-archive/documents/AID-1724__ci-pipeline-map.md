<!-- issue: AID-1724 | key: ci-pipeline-map | doc_id: 151c431a-0e22-47b3-985e-e3aba73b6fa6 | updated: 2026-09-13 12:23:48.657+00 -->

# Mapa do pipeline CI — snapshot 2026-09-13 (workflows, 38 check-runs, required checks, durações; evidência first-hand)

(AID-1724)

# Mapa do pipeline CI — dandpb/aidevschool (snapshot 2026-09-13, first-hand)

**Autor:** Platform & CI Engineer (AID-1724 onboarding). **Fase 1 = read-only** — nenhum write em repo/settings/produção foi feito para este mapa.

**Fontes de evidência (todas verificadas neste run, 2026-09-13 ~12:0xZ):**
- `ci.yml` @ `origin/main` = `4bb76005` (813 linhas; último commit no arquivo: `ddb31d87` 2026-09-13)
- GitHub Actions run **CI #1083** (push/main/`4bb76005`, iniciado 2026-09-13T11:37:55Z, `success`, **290s**, 38 check-runs) — `GET /repos/dandpb/aidevschool/actions/runs/…/jobs`
- `GET /repos/dandpb/aidevschool/branches/main/protection` (HTTP 200)
- Runs recentes (API actions/runs): push main **#1083 290s · #1081 354s · #1078 419s · #1076 321s** (média **~346s**); pull_request **#1082 335s · #1080 332s · #1077 318s · #1075 270s · #1073 559s · #1072 452s** (média **~384s**)

---

## 1. Workflows ativos (2)

### 1.1 `CI` — `.github/workflows/ci.yml`
Triggers: `push` **só em main** (economia de matrix em branches de agente — TECH_DEBT_AUDIT_2026-07-08 item 15, comentário no arquivo) + `pull_request` em toda branch.

22 definições de job; no último run de main expandem para **38 check-runs**. Grupos (nome exato do job → duração no run #1083):

| Grupo | Job (nome exato) | ci.yml (linha) | Duração #1083 |
|---|---|---|---|
| Governança | `SDLC guardrails (diff)` | :27 | **11s** ✓ |
| Governança | `Promotion precheck baseline (self-test + dry-run)` | :68 | **14s** ✓ |
| Governança | `DESIGN.md lint` | :780 | **8s** ✓ |
| Engine TS | `codexdojo-os (TS)` | :197 | **241s** ✓ (critical path) |
| Engine TS | `voxelDojo (TS)` | :147 | **224s** ✓ |
| Engine TS | `literacyDojo (TS + content)` | :313 | **108s** ✓ |
| Engine TS | `pixelDojo (TS)` | :105 | **63s** ✓ |
| Engine TS | `dojoToday (TS + substrate)` | :395 | **55s** ✓ |
| Engine TS | `miniTown (TS)` | :353 | **52s** ✓ |
| Engine TS | `codexDojo (TS)` | :81 | **26s** ✓ |
| Python | `Python (learner + curriculum shared)` | :291 | **26s** ✓ (incl. complexity gate ratchet AID-1636) |
| Python | `minimaxDojo (tutor core)` | — | **12s** ✓ |
| Python | `miniMaxEvolutionEngine (supervisor)` | — | **19s** ✓ |
| Python | `aiDevschoolMvp (installer + acceptance)` | — | **16s** ✓ |
| Python | `openclaw (checklist runner)` | :720 | **19s** ✓ |
| Curriculum | `curriculum Node (18 projects)` | :499 | **151s** ✓ (lockfile obrigatório AID-1670) |
| Curriculum | `curriculum Go` | :530 | **29s** ✓ |
| Curriculum | `curriculum Rust` | :546 | **30s** ✓ |
| Matrix | `voxeldojo-games-discover` / `voxelDojo games/game-NN-* (TS)` ×16 | :566/:577 | **48–79s** cada ✓ (matrix via `catalog.json`) |
| Matrix | `pixelDojo games/* (discover)` → vazio | :639 | **8s** ✓ |
| Matrix | `pixelDojo games/${{ matrix.game.name }} (TS)` | :665 | **skipped** (literal não-cadastrável) |
| Agregador | `product readiness (claims)` | :430 | **42s** ✓ (`needs` 6 produtores + `always()`; fail-fast PRODUCER-REPORTS-MISSING AID-1669) |

Padrões transversais: self-test sintético nos guardrails (violação sintética precisa falhar); retry determinístico Playwright `--retries=1 --trace on-first-retry` com artifact de traces "flaky" (AID-571/AID-1658); readiness reports como artifacts `*-readiness-<sha>` ingeridos só pelo agregador; `pnpm install --frozen-lockfile`/`npm ci` em todo TS.

### 1.2 `Readiness re-grant factory` — `.github/workflows/readiness-regrant.yml`
Trigger: `workflow_run` (CI completed) — **só propõe PR quando CI falha em push/main** — + `workflow_dispatch` com drills `run_id` (replay) / `fixture_drill` (AID-1669). Propõe, nunca verifica nem merga (`assessorContext` independente preservado; single-writer). Runs recentes: `skipped` 0–11s (CI verde não dispara); drill dispatch #154 = `success` 36s (2026-09-13T09:58Z).

---

## 2. Required checks em `main` (branch protection, GET first-hand 2026-09-13)

**Exigidos (4, nome exato):** `literacyDojo (TS + content)` · `codexdojo-os (TS)` · `Python (learner + curriculum shared)` · `product readiness (claims)`

**Flags:** `strict=true` · `dismiss_stale=true` · `required_approving_review_count=0` · `enforce_admins=true` · **`allow_force_pushes=true`** · `allow_deletions=false` · `required_conversation_resolution=false` · `require_code_owner_reviews=false`

**Não exigidos (rodam verdes mas não bloqueiam merge):** `SDLC guardrails (diff)` (11s), `Promotion precheck baseline`, `DESIGN.md lint`, `codexDojo/pixelDojo/voxelDojo/miniTown/dojoToday`, jobs Python per-engine, curriculum Go/Rust/Node, matrices voxelDojo games. **Exatamente o delta que o kit R1 (AID-1555, payload D) fecha:** +`SDLC guardrails (diff)` no required, `allow_force_pushes`→false, `required_conversation_resolution`→true.

## 3. Duração média e critical path

- **Push main:** média **~346s** (4 amostras: 290/354/419/321s). **PR:** média **~384s** (6 amostras: 270–559s).
- **Critical path = `codexdojo-os (TS)` 241s** (~70% do run): instala 5 workspaces pnpm/npm serial (`../codexDojo`, `../pixelDojo`, `../voxelDojo`, `../miniTown`, `../dojoToday`) + `pip install -e` + build + 2 suítes Playwright com chromium.
- Sequência: `voxelDojo (TS)` 224s, `curriculum Node` 151s, `literacyDojo` 108s.
- Matriz voxelDojo games escala com `catalog.json` (16 hoje; ~1 min cada, paralelas — pressão de fila, não de critical path).

## 4. Notas de auditoria (observações, nenhuma mudança proposta executada)

1. Guardrails de SDLC **rodam** (self-test + diff vs base atual do PR, fix AID-1272 de base stale) mas **não são required** até R1: um merge hoje não é mecanicamente bloqueado por eles.
2. `product readiness (claims)` depende de artifacts dos 6 produtores via `needs`+`always()`; produtor falso-positivo é pego pelo assert PRODUCER-REPORTS-MISSING (AID-1669) — caminho distinto do sinal READINESS-STALE-OR-INVALID da fábrica de re-grant.
3. Jobs skipped literais da matrix (`pixelDojo games/${{ matrix.game.name }}`) não são requeríveis — consistente com a emenda B1 do kit (required por nome exato de check-run, ratchet por PR).
