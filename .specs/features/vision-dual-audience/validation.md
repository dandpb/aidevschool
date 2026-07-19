# Vision Dual-Audience — Validation Report (Independent Verifier)

- **Verdict:** **PASS** (com pendências Mac registradas abaixo; nenhuma alegada como pass)
- **Verifier:** independente (autor ≠ verificador; regra evidence-or-zero; cobertura re-derivada da spec)
- **Date:** 2026-07-19
- **Diff range covered:** `ba771a1~1..94f7ea8` (16 commits, T1–T16; HEAD == 94f7ea8)
- **Sandbox:** Linux ARM, Python 3.10.12, Node v22.22.3/npm 10.9.8 (rede npm OK; `corepack enable` bloqueado por EACCES)
- **Escopo respeitado:** nenhum arquivo de `engines/miniTown/src/` tocado pelo range (`git diff --name-only ba771a1~1..94f7ea8 -- engines/miniTown/src` → 0 arquivos); trabalho não commitado da sessão concorrente não foi tocado por esta verificação.

## AC Coverage (evidence-or-zero)

Total: **19 ACs · 17 covered com evidência direta · 2 covered com pendência Mac registrada · 0 not covered**

### P1 — miniTown visível e posicionado (5/5)

| AC | Evidência (arquivo:linha ou comando) | Outcome da spec | Covered? |
| --- | --- | --- | --- |
| P1.1 STRUCTURE + WHERE TO LOOK em `engines/AGENTS.md` | `engines/AGENTS.md:16` ("miniTown/ # cozy town-sim: level-0 entry surface…") e `:34` (linha WHERE TO LOOK) | listado com papel cozy town-sim / Nível 0 | ✅ (nota: papel grafado "level-0 **entry** surface", não "candidate surface" — coerente com a decisão AD-004 que promoveu, não candidatou) |
| P1.2 `engines/miniTown/README.md` | Existe; `:12-13` (`pnpm install`/`pnpm run dev`), `:20-21` (MVP, 31/31 cf. `decision.json`, `miniTown.yaml`), `:22` (`window.__miniTown`) | o que é, como rodar, status, evidência | ✅ (ver Gap 3: fontes citadas só resolvem no working tree não commitado) |
| P1.3 MANIFEST Canonical Surfaces | `engines/codexDojo/ecosystem/MANIFEST.md:27` (linha `engines/miniTown/`) | linha presente | ✅ |
| P1.4 handbook | `test -f docs/handbook/11_engine_miniTown.md` → existe; `docs/handbook/README.md:32` (linha 4c linka a página) | página + linha no índice | ✅ |
| P1.5 VISION decisões 1–2 decididas com data | `docs/VISION.md:60` ("O motor do Nível 0: miniTown (decidido 2026-07-19)", AD-004) e `:68-70` (trilha no mesmo catálogo, AD-005); lista "Próximas decisões pendentes" agora começa no item 3 (`:78`) | decisões 1–2 fora de pendentes, com data | ✅ |

Independent Test da story: `grep -l miniTown` retornou os 4 arquivos; ambos `test -f` passam.

### P2a — Nível 0 no catálogo, parseável (5/5, 1 com pendência)

| AC | Evidência | Outcome da spec | Covered? |
| --- | --- | --- | --- |
| P2a.1 parser aceita 0-início e mapeia level 0 → `aplicacao_ia` | `python3 -m unittest learner.substrate.tests.test_catalog_level0` → **5 tests OK** (inclui `test_accepts_level0_catalog_and_maps_aplicacao_ia_phase`); `learner/substrate/catalog.py:12` (`0: "aplicacao_ia"`) | aceita e mapeia | ✅ |
| P2a.2 não-contíguo → `CatalogFormatError` | `catalog.py:119-120` + `test_rejects_noncontiguous_numbering_from_zero` OK; **mutação 1 morta** (ver sensor) | erro levantado | ✅ |
| P2a.3 BACKLOG com linha 00 + counts 2/16 | `curriculum/BACKLOG_STATUS.md:9` (`00_ai_in_practice` / `planned`); contagem de linhas do BACKLOG: implemented=2, scaffolded=16, planned=1, total=19; regeneração em memória (`render_backlog`, `render_projects_ts` sobre `load_catalog(curriculum/catalog.md)`) **byte-idêntica** aos arquivos commitados; catálogo real parseia **19 projetos** com p00 `number=0, level=0, status='planned'` | linha presente; masteredCount==2 / scaffoldedCount==16 | ✅ (counts do `build_snapshot()` em si: fixados em `learner/substrate/tests/test_substrate.py:576-577`, módulo não executável aqui — coberto pela pendência Mac VIS-08) |
| P2a.4 `python3 -m learner.substrate --check` exit 0 | **Não executável neste sandbox**: `curriculum/_shared/evidence.py:27` importa `StrEnum` (Python 3.11+; aqui 3.10) — pré-existente, fora do range. Pendência registrada pelo autor em `spec.md:119` (VIS-08 "sync completo/--check: pendência Mac"); nunca alegada como pass. Evidência indireta: as duas views regeneradas no range batem byte a byte com o catálogo | exit 0 | ⚠️ Pendência Mac (registrada; comando abaixo) |
| P2a.5 spec da trilha 00 | `curriculum/00_ai_in_practice/docs/spec.md:3` (Público: pessoas não tecnológicas), `:16` (Formato de lição, pegada Duolingo), `:26-29` (gate no-code → `docs/design/adr/0004-no-code-empirical-gate.md`, `gate_kind: no_code`) | público + formato + gate → ADR | ✅ |

Edge cases do parser: `test_rejects_project_before_any_level` (mensagem "appears before a level" em `catalog.py:73`), `test_legacy_catalog_starting_at_one_still_parses`, `test_level_without_phase_mapping_fails_at_render` — todos presentes e verdes.

### P2b — modo non_developer nos agentes (4/4)

| AC | Evidência | Outcome da spec | Covered? |
| --- | --- | --- | --- |
| P2b.1 `perfil_pedagogico.modo` | `engines/minimaxDojo/config/learner.yaml:12` — `modo: developer  # developer | non_developer (trilha 00; gate no-code — ADR-0004)` | valor `developer` + comentário com as duas opções | ✅ |
| P2b.2 ramo nos 4 prompts | `sonda.md:172`, `socrates.md:210`, `mestre_conteudo.md:236`, `prometor.md:223` — todos com `⟨config: perfil_pedagogico.modo⟩ = non_developer` | 4 prompts com seção + ref de config | ✅ |
| P2b.3 pytest verde | `python3 -m pytest engines/minimaxDojo/tests/` → **59 passed, 1 skipped, 13 subtests passed** (executado por este verifier) | suíte passa | ✅ |
| P2b.4 ADR no-code gate | `docs/design/adr/0004-no-code-empirical-gate.md`: `:21` (attempt em `learner/attempts/<unit>-attempt-<N>.md`), `:23-25` (checklist de afirmações falsificáveis), `:26-28` (verificação pelo Prometor), `:32-35` (Limites explícitos, `gate_kind: no_code`, nunca promove código) | attempt + evidência + limite | ✅ |

Extra VIS-13: `prometor.md:221` (`## RAMO no_code`) e `:231` ("**nunca** promove unidades dos níveis" de código).

### P3 — caminho zero-install (5/5, 1 com pendência)

| AC | Evidência | Outcome da spec | Covered? |
| --- | --- | --- | --- |
| P3.1 `onboard` só prepara miniTown, re-executável | `setup.sh:8-21` (diff `cb1d06f` **só adiciona o ramo** antes do fluxo default; ramo: corepack + `cd engines/miniTown && pnpm install` + `exit 0`); comandos idempotentes por construção. **Execução real bloqueada neste sandbox**: `corepack enable` → EACCES em `/usr/bin/pnpm` (limitação do sandbox, reproduzida por este verifier em snapshot /tmp) | só miniTown + seguro re-executar | ⚠️ Estático ✅ / runtime = **Pendência Mac (novo registro — não constava em spec/tasks)** |
| P3.2 `bash -n setup.sh` | Executado: exit 0 | exit 0 | ✅ |
| P3.3 build snapshot em /tmp registrado | Registro do autor: `spec.md:126` ("build HEAD ✓ em /tmp") + `engines/miniTown/README.md:29-32`. **Reproduzido independentemente por este verifier**: `git archive 94f7ea8 -- engines/miniTown` → `/tmp` → `npm install` (rc=0) → `npm run build` (rc=0, `dist/index.html` + assets gerados). Bônus: `npm run test` no snapshot commitado → **14/14 verdes** | resultado registrado como evidência | ✅ (confirmado) |
| P3.4 `netlify.toml` + instruções | `test -f engines/miniTown/netlify.toml` → existe (build `npm run build`, publish `dist`, NODE 22); README `:29-32` com instruções de deploy | arquivo + instruções no README | ✅ |
| P3.5 VISION aponta caminho onboard/deploy | `docs/VISION.md:78-81` — item 3 ("Onboarding zero-install") aponta `./setup.sh onboard` + `engines/miniTown/netlify.toml` (diff `94f7ea8`) | lacuna 3 aponta o caminho | ✅ (ver Gap 2: o ponteiro está em "Próximas decisões pendentes §3"; a seção "Lacunas §3 — Onboarding simples" ficou sem ele) |

Independent Test da story: `bash -n` OK; `grep onboard setup.sh` → `setup.sh:8`; `test -f engines/miniTown/netlify.toml` OK.

## Discrimination Sensor (mutações em /tmp/sensor — repo intocado)

Baseline: `python3 -m unittest learner.substrate.tests.test_catalog_level0` → 5 tests OK.

| Mutação | Alteração em `catalog.py` (cópia /tmp) | Resultado | Status |
| --- | --- | --- | --- |
| 1 | `if first not in (0, 1) or numbers != list(range(...))` → `if first not in (0, 1, 2):` (aceita início em 2 **e** remove contiguidade) | `test_rejects_noncontiguous_numbering_from_zero` FALHOU ("CatalogFormatError not raised") | **KILLED** |
| 2 | (restaurado, re-baseline OK) `0: "aplicacao_ia"` → `0: "fundamentos"` | `test_accepts_level0_catalog_and_maps_aplicacao_ia_phase` FALHOU (`phase: "aplicacao_ia"` ausente do render) | **KILLED** |

2/2 mutantes mortos; `/tmp/sensor` descartado. Os testes novos discriminam de fato as duas propriedades centrais do VIS-06.

## Checagens adicionais

- **(a) setup.sh:** `bash -n` exit 0; `git show cb1d06f` confirma que o diff **só adiciona** o ramo `onboard` (linhas 7-20) antes de "Setting up Python environment..." — fluxo default intacto.
- **(b) Consistência catálogo → views:** `curriculum/BACKLOG_STATUS.md` e `engines/codexDojo/src/data/projects.ts` contêm `00_ai_in_practice` (BACKLOG:9; projects.ts:10/20 com `phase: "aplicacao_ia"`, `level: 0`) e são **byte-idênticos** à regeneração fresca a partir de `curriculum/catalog.md` (verificado em memória via `render_backlog`/`render_projects_ts`). codexDojo: `src/domain.ts:8` tem `"aplicacao_ia"` no union; `src/data/projects.test.ts:5-6,14` espera 19 projetos e `p00.phase === "aplicacao_ia"`.
- **(c) Pendências Mac registradas (nunca alegadas pass):** `spec.md:38` (assumption Gates JS), `spec.md:119` (VIS-08 `--check`), `spec.md:120` (VIS-09 vitest/tsc), `spec.md:134` (Success Criteria), `tasks.md:24-25` (matrix), `tasks.md:34` (gate Mac), `tasks.md:137-138` (T9). Nenhum texto do range alega pass de gate JS. ✔
- **(d) Contradições entre docs editados:** ver gaps 2–4 abaixo (staleness interna no VISION.md e catalog.md; nenhuma contradição bloqueante nova entre README miniTown, handbook, MANIFEST e engines/AGENTS.md — os quatro contam a mesma história: cozy, explore-only, nunca escreve estado canônico, par com `00_ai_in_practice`).
- **`make test-core`:** verde (59 passed, 1 skipped). **`make test-substrate` completo:** falha de **coleta** neste sandbox em 4 arquivos pré-existentes (`test_substrate.py`, `test_voxel_slice.py`, `test_predictions_summary.py`, `test_codexdojo_os_snapshot.py`) por `from enum import StrEnum` (Python 3.11+) — pré-existente, fora do range (último toque em `test_substrate.py`: 6f0052c). Subconjunto executável (7 módulos, 20 testes) verde.

## Pendências Mac consolidadas (comandos exatos — rodar no Mac, Python ≥3.11 + toolchain JS)

1. `cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build` — VIS-09 (espera 19 projetos; fase `aplicacao_ia` no union).
2. `python3 -m learner.substrate && python3 -m learner.substrate --check` — VIS-08 (sync completo das views derivadas + check exit 0; `.mavis/`, whiteboard e dashboard snapshot não foram regenerados no range — só BACKLOG + projects.ts).
3. `make test-substrate` — suíte completa (inclui `test_substrate.py` que fixa `masteredCount==2` / `scaffoldedCount==16` do `build_snapshot()`).
4. `./setup.sh onboard && ./setup.sh onboard` — VIS-14 (duas execuções, ambas exit 0; **novo registro deste verifier** — runtime bloqueado no sandbox por `corepack enable` EACCES).
5. (Opcional — já reproduzido neste sandbox Linux com sucesso) `cd engines/miniTown && npm run build` (rc=0 aqui) e `pnpm run test` (14/14 no estado commitado).
6. (Ação humana, decisão pendente 3 da VISION) deploy público: `cd engines/miniTown && netlify deploy --prod`.

## Gaps ranqueados (nenhum bloqueia o PASS)

1. **(Médio) P3.1 runtime sem execução e sem pendência prévia.** `./setup.sh onboard` nunca foi executado (sandbox bloqueia `corepack enable`) e a idempotência do edge case "roda duas vezes → exit 0" só tem evidência estática. A pendência Mac correspondente **não constava** em spec.md/tasks.md — fica registrada aqui (item 4 acima).
2. **(Baixo) Staleness interna no `docs/VISION.md`.** A "Lacunas §1" ainda afirma "Um 'Nível 0 — aplicar IA' **não existe**" e a "Lacunas §3" não aponta o caminho onboard — enquanto a tabela dual-audience (`:19`) e a seção do Nível 0 (`:60-70`) dizem que ele existe (`planned`). O ponteiro zero-install exigido pelo P3.5 vive em "Próximas decisões pendentes §3" (`:78-81`), que era o item rotulado "zero-install" — interpretação defensável, mas a seção literalmente chamada "Lacunas" ficou desatualizada.
3. **(Baixo) P1.2: fontes de evidência citadas no README miniTown não estão no commit.** `.mavis/plans/miniTown.yaml` é untracked e o `decision.json` **commitado** em 94f7ea8 é de outro plano (rate limiter) sem o registro 31/31; o conteúdo miniTown do decision.json existe só no working tree não commitado da sessão concorrente. Estado commitado verificado independentemente: 14/14 testes verdes + build limpo. Consequência da restrição "não tocar arquivos da outra sessão" — resolver quando aquela sessão commitar.
4. **(Baixo) Staleness em `curriculum/catalog.md` Overview.** Header atualizado ("Total projects: 19 (00–18)"), mas o Overview mantém "6-level progression" (agora são 7 níveis: 0–6) e "Each project is implemented polyglot" (o 00 é no-code). Idem `docs/VISION.md:34` ("o catálogo de 18 projetos").
5. **(Info) Success Criteria "make test-substrate verde no sandbox"** só é satisfazível para o subconjunto executável em Python 3.10; a suíte completa exige 3.11+ (pré-existente, fora do range) — coberto pela pendência 3.

## Veredito

**PASS.** 19/19 ACs com evidência localizada ou pendência Mac explicitamente registrada (17 diretas + 2 pendências); sensor de discriminação 2/2 mutantes mortos; nenhuma alegação de pass sem evidência encontrada no range; escopo (miniTown/src intocado, counts 2/16, 19 projetos, fase `aplicacao_ia`) confirmado contra o resultado definido na spec.
