# Vision Dual-Audience (Nível 0 + miniTown + modo non_developer + zero-install) — Specification

> **Decisões do usuário (2026-07-19):** miniTown promovido a Nível 0 (entrada cozy) · escopo completo P0–P3 do
> `docs/AUDIT_ENGINES_CURRICULUM_2026-07-19.md` · trilha não-técnica no **mesmo catálogo** (`curriculum/00_ai_in_practice/`).

## Problem Statement

A ideia central (`docs/VISION.md`) pede dois públicos — não-técnicos e programadores — mas o ecossistema
só implementa o segundo. O engine certo para o primeiro público (`engines/miniTown/`, cozy, 31/31 testes)
está invisível: fora do inventário, do MANIFEST, do handbook e do catálogo. Não existe trilha Nível 0,
os agent prompts pressupõem dev, e o onboarding exige toolchain completa.

## Goals

- [ ] miniTown classificado como engine de primeira classe e posicionado como Nível 0 na VISION
- [ ] Catálogo ganha Nível 0 (`00_ai_in_practice`) parseável pelo substrato sem quebrar views nem contagens
- [ ] Agent prompts ganham ramo `non_developer` atrás do config seam
- [ ] Caminho zero-install documentado e executável (`setup.sh onboard` + build estático/deploy do miniTown)

## Out of Scope

| Feature | Reason |
| --- | --- |
| Conteúdo pedagógico completo da trilha 00 | Este ciclo cria a identidade + spec inicial; unidades reais são ciclos futuros |
| Replicação multi-learner | Decisão pendente 4 da VISION — feature própria |
| Mudanças em `engines/miniTown/src/` | Sessão concorrente ativa no engine; este ciclo só adiciona README/config de deploy |
| Encounters novos (pixel/voxel) | Gatilho de currículo (SPEC_plano_execucao Non-Goals) |
| Marcar 00 como `scaffolded`/`implemented` | AD-002: status avança só pelo fluxo gateado |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Nome/slug do projeto 00 | "AI na Prática" / `00_ai_in_practice` | Escolha do usuário (trilha no mesmo catálogo) | y |
| Status inicial do 00 | `planned` | Status conhecido do parser; não altera contagens (2 implemented/16 scaffolded) nem exige `go-impl`/`rust-impl`/`node-impl` (drift test exige artefatos só para `scaffolded`) | y (derivado de teste) |
| Chave de fase do Level 0 | `aplicacao_ia` | Segue o padrão pt das fases existentes (`fundamentos`, `concorrencia`…) | n (assumido) |
| Contiguidade do parser | números contíguos começando em 0 **ou** 1 | Retrocompatível com catálogos 01–18 | y (design) |
| Gates JS (codexDojo, miniTown) | Não rodam neste sandbox (binários nativos macOS em Linux ARM) | Verificação fica **pendente no Mac** com comando exato; nunca declarada como pass | y (probe executado) |
| Deploy público | Tentar build em snapshot `/tmp` + Netlify; fallback = `netlify.toml` + instruções | Rede/toolchain do sandbox pode bloquear; degradar sem falhar o ciclo | y |
| Modo pedagógico default | `modo: developer` | Instância atual é o Daniel (dev); non_developer é opt-in | y |

**Open questions:** none — all resolved or logged above.

## User Stories

### P1: miniTown visível e posicionado ⭐ MVP

**User Story**: Como mantenedor, quero o miniTown no inventário e posicionado como Nível 0 para que a peça da visão dupla deixe de ser invisível.

**Acceptance Criteria**:

1. WHEN alguém lê `engines/AGENTS.md` THEN a STRUCTURE e o WHERE TO LOOK SHALL listar `miniTown/` com papel "cozy town-sim (Nível 0 candidate surface)"
2. WHEN alguém abre `engines/miniTown/README.md` THEN ele SHALL existir com: o que é, como rodar (`pnpm install && pnpm run dev`), status (MVP, 31/31 testes conforme `decision.json`), e evidência (`window.__miniTown`, `.mavis/plans/miniTown.yaml`)
3. WHEN alguém lê `engines/codexDojo/ecosystem/MANIFEST.md` THEN Canonical Surfaces SHALL ter linha para `engines/miniTown/`
4. WHEN alguém navega `docs/handbook/README.md` THEN a tabela SHALL linkar uma página `11_engine_miniTown.md` existente
5. WHEN alguém lê `docs/VISION.md` THEN as decisões pendentes 1–2 SHALL constar como decididas (miniTown = Nível 0; trilha no mesmo catálogo) com data

**Independent Test**: `grep -l miniTown engines/AGENTS.md engines/codexDojo/ecosystem/MANIFEST.md docs/handbook/README.md docs/VISION.md` retorna 4 arquivos; `test -f engines/miniTown/README.md docs/handbook/11_engine_miniTown.md`.

### P2a: Nível 0 no catálogo, parseável

**User Story**: Como aprendiz futuro não-técnico, quero a trilha Nível 0 no catálogo canônico para que ela exista no mesmo sistema de verdade dos outros 18 projetos.

**Acceptance Criteria**:

1. WHEN `parse_catalog` lê um catálogo com `## Level 0` + `### 00.` THEN ele SHALL aceitar números contíguos começando em 0 e mapear level 0 → fase `aplicacao_ia`
2. WHEN o catálogo tem números não contíguos (ex.: 00 depois 02) THEN `parse_catalog` SHALL levantar `CatalogFormatError`
3. WHEN `curriculum/catalog.md` ganha o projeto `00_ai_in_practice` (status `planned`) e o substrato regenera THEN `BACKLOG_STATUS.md` SHALL ter a linha `00_ai_in_practice`/`planned` e `build_snapshot()` SHALL manter `masteredCount == 2` e `scaffoldedCount == 16`
4. WHEN `python3 -m learner.substrate --check` roda após a regeneração THEN o exit code SHALL ser 0
5. WHEN `curriculum/00_ai_in_practice/docs/spec.md` é lido THEN ele SHALL declarar o público (não-técnicos), o formato de lição (pequena, aplicar-IA), e que o gate segue o ADR no-code (P2b)

**Independent Test**: `make test-substrate` verde com os testes novos de Level 0; grep da linha 00 no BACKLOG gerado.

### P2b: modo non_developer nos agentes

**User Story**: Como aprendiz não-técnico futuro, quero que Sonda/Sócrates/Mestre-Conteúdo/Prometor tenham um modo sem código para que a trilha 00 seja ensinável pelo mesmo roster.

**Acceptance Criteria**:

1. WHEN `engines/minimaxDojo/config/learner.yaml` é lido THEN `perfil_pedagogico.modo` SHALL existir com valor `developer` e comentário listando `developer | non_developer`
2. WHEN os prompts `sonda.md`, `socrates.md`, `mestre_conteudo.md`, `prometor.md` são lidos THEN cada um SHALL ter uma seção de ramo `non_developer` referenciando `⟨config: perfil_pedagogico.modo⟩`
3. WHEN `python3 -m pytest engines/minimaxDojo/tests/` roda THEN a suíte SHALL passar (config seam valida os refs novos)
4. WHEN `docs/design/adr/` é listado THEN um ADR "no-code empirical gate" SHALL existir definindo: attempt = log escrito em `learner/attempts/`, evidência = checklist de afirmações falsificáveis verificado pelo Prometor, e o limite explícito (mais fraco que evidência executável de código; nunca promove unidade de código)

**Independent Test**: pytest verde + grep dos 4 prompts por `non_developer`.

### P3: caminho zero-install

**User Story**: Como pessoa não-técnica, quero abrir o miniTown sem instalar toolchain para que a porta de entrada seja real.

**Acceptance Criteria**:

1. WHEN `./setup.sh onboard` é executado THEN ele SHALL preparar apenas o miniTown (corepack/pnpm + install) sem tocar nos outros engines, e SHALL ser seguro re-executar
2. WHEN `bash -n setup.sh` roda THEN exit 0
3. WHEN o build estático é tentado num snapshot em `/tmp` THEN o resultado (sucesso com `dist/` OU falha de toolchain/rede) SHALL ser registrado como evidência; falha não bloqueia o ciclo, vira pendência com comando exato para o Mac
4. WHEN o deploy público não for possível desta sessão THEN `engines/miniTown/netlify.toml` + instruções de deploy SHALL existir no README do miniTown
5. WHEN `docs/VISION.md` é lido THEN a lacuna 3 (zero-install) SHALL apontar para o caminho onboard/deploy

**Independent Test**: `bash -n setup.sh`; grep `onboard` em setup.sh; `test -f engines/miniTown/netlify.toml`.

## Edge Cases

- WHEN o catálogo tem `### 00.` sem `## Level 0` antes THEN parser SHALL falhar com "appears before a level"
- WHEN o catálogo omite o 00 (formato legado 01–18) THEN parser SHALL continuar aceitando (retrocompatível)
- WHEN `render_projects_ts` encontra level sem fase mapeada THEN SHALL levantar `CatalogFormatError` (comportamento atual preservado)
- WHEN `setup.sh onboard` roda duas vezes THEN a segunda execução SHALL terminar com exit 0

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VIS-01 | P1 (engines/AGENTS.md) | Execute | Implemented (1e5c967) |
| VIS-02 | P1 (README miniTown) | Execute | Implemented (ba771a1) |
| VIS-03 | P1 (MANIFEST) | Execute | Implemented (972b9fc) |
| VIS-04 | P1 (handbook) | Execute | Implemented (6882ea4) |
| VIS-05 | P1 (VISION posicionamento) | Execute | Implemented (8e52f12) |
| VIS-06 | P2a (parser Level 0 + testes) | Execute | Implemented (683d312) |
| VIS-07 | P2a (catalog.md 00 + spec da trilha) | Execute | Implemented (e7261da) |
| VIS-08 | P2a (regen + counts + --check) | Execute | Implemented (52c37ed; sync completo/--check: pendência Mac) |
| VIS-09 | P2a (codexDojo phases + test 19) | Execute | Implemented (70a1a3e; vitest/tsc: pendência Mac) |
| VIS-10 | P2b (ADR no-code gate) | Execute | Implemented (f4e7b4b) |
| VIS-11 | P2b (learner.yaml modo) | Execute | Implemented (43a68b9) |
| VIS-12 | P2b (prompts tutor) | Execute | Implemented (f08e6c4) |
| VIS-13 | P2b (prometor no-code) | Execute | Implemented (05b7edf) |
| VIS-14 | P3 (setup.sh onboard) | Execute | Implemented (cb1d06f) |
| VIS-15 | P3 (build snapshot + deploy/fallback) | Execute | Implemented (c2e1bda; build HEAD ✓ em /tmp) |
| VIS-16 | P3 (links zero-install) | Execute | Implemented (commit final) |

**Coverage:** 16 total, 16 mapped to tasks, 0 unmapped

## Success Criteria

- [ ] `grep miniTown` encontra o engine em todas as superfícies canônicas de inventário
- [ ] `make test-substrate` e `make test-core` verdes no sandbox; pendências JS listadas com comando exato para o Mac
- [ ] Snapshot counts inalterados (2/16) com o 00 presente no BACKLOG
- [ ] Nenhum arquivo de `engines/miniTown/src/` tocado

## Dimensions sweep (Large)

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | VIS-06 AC2 (contiguidade), edge cases do parser |
| Failure / partial-failure | VIS-08 (`--check`), VIS-15 (fallback deploy) |
| Idempotency / retry | VIS-14 (onboard re-executável); regen do substrato já é idempotente |
| Auth boundaries & rate limits | N/A because sem auth; deploy usa conta do Daniel (ação humana se MCP não autenticado) |
| Concurrency / ordering | Sessão concorrente no miniTown → Out of Scope proíbe tocar `src/`; commits só com paths próprios |
| Data lifecycle / expiry | N/A because docs/config, sem dados com TTL |
| Observability | VIS-08 (`--check` como detector de drift) |
| External-dependency failure | VIS-15 (npm/rede podem falhar → evidência + pendência) |
| State-transition integrity | Status 00 nasce `planned`; promoção segue AD-002 (nunca manual) |
