# Vision Dual-Audience — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: activate it by name and follow its Execute flow
and Critical Rules. If the skill cannot be activated, STOP.

**Design**: `.specs/features/vision-dual-audience/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase + guidelines. Guidelines found: `AGENTS.md` (regras de ouro), `CLAUDE.md`,
> `docs/FUNDAMENTOS.md` (F3/F6: aceite executável), `Makefile` (test targets), `pyproject.toml` (pytest).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Substrato Python (`learner/substrate/catalog.py`) | unit | 1:1 com ACs VIS-06 + edge cases listados | `learner/substrate/tests/test_*.py` | `python3 -m unittest discover -s learner/substrate/tests` |
| Config seam minimaxDojo (`config/learner.yaml`, prompts) | unit (existente) | Suíte existente verde valida refs `⟨config:⟩` novos | `engines/minimaxDojo/tests/` | `python3 -m pytest engines/minimaxDojo/tests/` |
| Docs / markdown (inventário, README, ADR, VISION) | none | Gate por grep/`test -f` (aceite executável F6) | — | comandos grep por task |
| Shell (`setup.sh`) | none | `bash -n` + execução dupla idempotente | — | `bash -n setup.sh` |
| codexDojo TS (`domain.ts`, `projects.test.ts`) | unit (**não roda neste sandbox**) | Teste espera 19 projetos; fase nova no union | `engines/codexDojo/src/**/*.test.ts` | `pnpm run test` **(pendência Mac)** |
| miniTown build | none (**não roda neste sandbox**) | Build de snapshot em /tmp; evidência do resultado | — | `npm run build` no snapshot **(ou Mac)** |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes Python de substrato | `python3 -m unittest discover -s learner/substrate/tests` |
| Full | Tasks tocando config seam + substrato | `python3 -m pytest engines/minimaxDojo/tests/ && python3 -m unittest discover -s learner/substrate/tests` |
| Build | Docs/shell/fase final | greps de aceite da task + `bash -n setup.sh` + `python3 -m learner.substrate --check` |
| Mac (pendência) | codexDojo/miniTown JS | `cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build` — **registrada, nunca declarada pass daqui** |

---

## Execution Plan

### Phase 1: Inventário + posicionamento (P0+P1) — docs only

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Nível 0 no catálogo (substrato + catálogo + dashboard)

```
T6 → T7 → T8 → T9
```

### Phase 3: Modo non_developer (ADR + config + prompts)

```
T10 → T11 → T12 → T13
```

### Phase 4: Zero-install

```
T14 → T15 → T16
```

---

## Task Breakdown

### T1: Criar `engines/miniTown/README.md`

**What**: README mínimo (~15 linhas): o que é, como rodar, status factual (31/31 testes cf. `decision.json`), evidência (`window.__miniTown`), posição na visão (Nível 0).
**Where**: `engines/miniTown/README.md` (novo)
**Depends on**: None · **Requirement**: VIS-02
**Done when**: arquivo existe; `grep -q "pnpm run dev" engines/miniTown/README.md`; zero mudanças em `src/`
**Tests**: none · **Gate**: build (grep) · **Commit**: `docs(minitown): add engine README`

### T2: Inventariar miniTown em `engines/AGENTS.md`

**What**: Linha na STRUCTURE + linha no WHERE TO LOOK.
**Where**: `engines/AGENTS.md`
**Depends on**: T1 · **Requirement**: VIS-01
**Done when**: `grep -c miniTown engines/AGENTS.md` ≥ 2
**Tests**: none · **Gate**: build (grep) · **Commit**: `docs(engines): add miniTown to inventory`

### T3: Inventariar miniTown no MANIFEST

**What**: Linha em Canonical Surfaces do `engines/codexDojo/ecosystem/MANIFEST.md`.
**Where**: `engines/codexDojo/ecosystem/MANIFEST.md`
**Depends on**: T1 · **Requirement**: VIS-03
**Done when**: `grep -q "engines/miniTown/" engines/codexDojo/ecosystem/MANIFEST.md`
**Tests**: none · **Gate**: build (grep) · **Commit**: `docs(manifest): add miniTown surface`

### T4: Página do handbook + linha no índice

**What**: `docs/handbook/11_engine_miniTown.md` (curta, padrão das outras páginas) + linha na tabela do `docs/handbook/README.md`.
**Where**: `docs/handbook/11_engine_miniTown.md` (novo), `docs/handbook/README.md`
**Depends on**: T1 · **Requirement**: VIS-04
**Done when**: `test -f docs/handbook/11_engine_miniTown.md`; grep no índice
**Tests**: none · **Gate**: build (grep) · **Commit**: `docs(handbook): add miniTown engine page`

### T5: Atualizar VISION.md (decisões 1–2 tomadas)

**What**: Seção "Próximas decisões pendentes": itens 1–2 viram decididos (com data, apontando AD-004/AD-005); parágrafo posicionando miniTown como motor do Nível 0.
**Where**: `docs/VISION.md`
**Depends on**: T2 · **Requirement**: VIS-05
**Done when**: `grep -q miniTown docs/VISION.md`; itens 1–2 não constam mais como "não decididas"
**Tests**: none · **Gate**: build (grep) · **Commit**: `docs(vision): record miniTown as level-0 engine`

### T6: Suporte a Level 0 no parser + testes

**What**: `_LEVEL_PHASES[0]="aplicacao_ia"`; contiguidade a partir de 0 ou 1 (design D1); testes unitários novos (aceita 0-início; rejeita não-contíguo; rejeita projeto antes de level; fase de level desconhecido ainda falha).
**Where**: `learner/substrate/catalog.py`, `learner/substrate/tests/test_catalog_level0.py` (novo)
**Depends on**: None · **Requirement**: VIS-06
**Done when**: testes novos passam; suíte substrato inteira verde; contagem de testes ≥ baseline
**Tests**: unit · **Gate**: quick · **Commit**: `feat(substrate): parse level-0 catalog entries`

### T7: Projeto 00 no catálogo + spec da trilha

**What**: `## Level 0` + `### 00. AI na Prática` em `curriculum/catalog.md` (status `planned`, slug `00_ai_in_practice`, campos exigidos pelo parser) + `curriculum/00_ai_in_practice/docs/spec.md` (público, formato de lição, gate → ADR no-code).
**Where**: `curriculum/catalog.md`, `curriculum/00_ai_in_practice/docs/spec.md` (novo)
**Depends on**: T6 · **Requirement**: VIS-07
**Done when**: `python3 -c "from learner.substrate.catalog import load_catalog; ..."` carrega 19 projetos com o 00 `planned`; suíte verde
**Tests**: unit (parser sobre o catálogo real) · **Gate**: quick · **Commit**: `feat(curriculum): add level-0 ai-in-practice track`

### T8: Regenerar views + verificar invariantes

**What**: `python3 -m learner.substrate` (regen BACKLOG, projects.ts, snapshot) + `--check`; confirmar counts 2/16 e linha 00 no BACKLOG.
**Where**: gerados (`curriculum/BACKLOG_STATUS.md`, `engines/codexDojo/src/data/projects.ts`, `.mavis/`, whiteboard)
**Depends on**: T7 · **Requirement**: VIS-08
**Done when**: `--check` exit 0; `make test-substrate` verde; grep `00_ai_in_practice.*planned` no BACKLOG
**Tests**: unit (suíte existente) · **Gate**: full · **Commit**: `chore(substrate): regenerate views with level-0 project`

### T9: codexDojo — fase nova + expectativa 19

**What**: `"aplicacao_ia"` em `projectPhases` (`domain.ts`); `projects.test.ts` espera 19 e valida fase do p00.
**Where**: `engines/codexDojo/src/domain.ts`, `engines/codexDojo/src/data/projects.test.ts`
**Depends on**: T8 · **Requirement**: VIS-09
**Done when**: mudanças aplicadas + **pendência Mac registrada** (`pnpm run lint && pnpm run test && pnpm run build`) — sem alegação de pass
**Tests**: unit (**pendência Mac**) · **Gate**: Mac (pendência) · **Commit**: `feat(codexdojo): add aplicacao_ia phase for level-0`

### T10: ADR do gate no-code

**What**: `docs/design/adr/` ganha ADR (design D5): attempt/evidência/limites/`gate_kind: no_code`.
**Where**: `docs/design/adr/ADR-no-code-gate.md` (novo; seguir numeração local se houver)
**Depends on**: None · **Requirement**: VIS-10
**Done when**: arquivo existe com as 3 seções (attempt, evidência, limites); linkado do spec da trilha (T7)
**Tests**: none · **Gate**: build (grep) · **Commit**: `docs(adr): define no-code empirical gate`

### T11: `perfil_pedagogico.modo` no config seam

**What**: Campo `modo: developer` + comentário `developer | non_developer` em `learner.yaml`.
**Where**: `engines/minimaxDojo/config/learner.yaml`
**Depends on**: T10 · **Requirement**: VIS-11
**Done when**: `python3 -m pytest engines/minimaxDojo/tests/` verde (config seam)
**Tests**: unit (suíte existente) · **Gate**: full · **Commit**: `feat(tutor-config): add pedagogical mode seam`

### T12: Ramo non_developer nos prompts de tutoria

**What**: Seção curta "Ramo non_developer" em `sonda.md`, `socrates.md`, `mestre_conteudo.md` com `⟨config: perfil_pedagogico.modo⟩` (analogias, zero código, aponta gate no-code).
**Where**: `engines/minimaxDojo/prompts/per_agent/{sonda,socrates,mestre_conteudo}.md`
**Depends on**: T11 · **Requirement**: VIS-12
**Done when**: grep `non_developer` nos 3; pytest verde (refs válidos)
**Tests**: unit (suíte existente) · **Gate**: full · **Commit**: `feat(tutor-prompts): add non-developer branch`

### T13: Ramo no-code verifier no Prometor

**What**: Seção no `prometor.md`: verificação por checklist falsificável (ADR T10), nunca promove unidade de código por essa via.
**Where**: `engines/minimaxDojo/prompts/per_agent/prometor.md`
**Depends on**: T12 · **Requirement**: VIS-13
**Done when**: grep `no_code` no prompt; pytest verde
**Tests**: unit (suíte existente) · **Gate**: full · **Commit**: `feat(tutor-prompts): add no-code verifier branch`

### T14: `setup.sh onboard`

**What**: Argumento `onboard`: prepara só o miniTown (corepack + pnpm install) e imprime como abrir; sem arg = fluxo atual intacto; idempotente.
**Where**: `setup.sh`
**Depends on**: None · **Requirement**: VIS-14
**Done when**: `bash -n setup.sh` exit 0; fluxo default inalterado (diff só adiciona ramo)
**Tests**: none · **Gate**: build (`bash -n`) · **Commit**: `feat(setup): add zero-install onboard mode`

### T15: Build snapshot + deploy (ou fallback)

**What**: Snapshot de miniTown (sem node_modules/dist) em `/tmp`; `npm install && npm run build`; se ok, tentar deploy (Netlify MCP); qualquer resultado vira evidência. Fallback: `engines/miniTown/netlify.toml` + instruções no README.
**Where**: `/tmp` (efêmero), `engines/miniTown/netlify.toml` (novo), `engines/miniTown/README.md`
**Depends on**: T14 · **Requirement**: VIS-15
**Done when**: resultado do build registrado (sucesso ou falha + causa); `test -f engines/miniTown/netlify.toml`
**Tests**: none · **Gate**: build (evidência + grep) · **Commit**: `feat(minitown): add static deploy config`

### T16: Links zero-install + fechamento

**What**: VISION.md lacuna 3 aponta o caminho onboard/deploy; lista consolidada de pendências Mac no fim de `validation.md` via Verifier; spec.md traceability atualizada.
**Where**: `docs/VISION.md`, `.specs/features/vision-dual-audience/spec.md`
**Depends on**: T15 · **Requirement**: VIS-16
**Done when**: grep `onboard` em docs/VISION.md; traceability sem Pending
**Tests**: none · **Gate**: build (grep + `python3 -m learner.substrate --check`) · **Commit**: `docs(vision): link zero-install path`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4 ──→ T5
Phase 2:  T6 ──→ T7 ──→ T8 ──→ T9
Phase 3:  T10 ──→ T11 ──→ T12 ──→ T13
Phase 4:  T14 ──→ T15 ──→ T16
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1–T5 | 1 arquivo doc cada (T4: página + linha de índice, coeso) | ✅ |
| T6 | 1 módulo + seu teste (co-locado) | ✅ |
| T7 | 1 entrada de catálogo + 1 spec (coeso: mesma identidade) | ✅ |
| T8 | 1 regeneração + verificação | ✅ |
| T9 | 2 arquivos do mesmo contrato (union + teste) | ✅ |
| T10–T13 | 1 arquivo cada | ✅ |
| T14–T16 | 1 entrega cada | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | início Phase 1 | ✅ |
| T2, T3, T4 | T1 | T1→T2→T3→T4 (sequencial dentro da fase) | ✅ |
| T5 | T2 | após T4 na fase (ordem preserva T2<T5) | ✅ |
| T6 | None | início Phase 2 | ✅ |
| T7 | T6 · T8: T7 · T9: T8 | cadeia Phase 2 | ✅ |
| T10 | None · T11: T10 · T12: T11 · T13: T12 | cadeia Phase 3 | ✅ |
| T14 | None · T15: T14 · T16: T15 | cadeia Phase 4 | ✅ |

## Test Co-location Validation

| Task | Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1–T5, T10 | docs | none (grep gate) | none | ✅ |
| T6 | substrato Python | unit | unit (co-locado) | ✅ |
| T7, T8 | substrato/catálogo | unit | unit (suíte + parser real) | ✅ |
| T9 | codexDojo TS | unit (pendência Mac) | unit (pendência Mac) | ✅ |
| T11–T13 | config seam | unit (suíte existente) | unit | ✅ |
| T14–T16 | shell/docs | none | none | ✅ |
