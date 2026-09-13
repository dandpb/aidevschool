# Dev journeys Wave 1 — re-verificação Node (02, 05, 12, 18)

| Campo | Valor |
| --- | --- |
| Issue | AID-1633 (Wave 1 do `readiness-refresh-plan.md` §5) |
| Data de execução | 2026-09-13, 05:09–05:12 UTC |
| Baseline pinado | main @ `05fca3492c050e7d160af373a2189dcd3cc48027` (working tree limpa; verificação read-only) |
| Executor | Docs & Readiness Engineer (agente, AID-1633) |
| Ambiente | sandbox node v24.18.0 / npm 11.17.0; `npm install --include=dev --no-package-lock --no-audit --no-fund` (`.npmrc` do sandbox usa `omit=dev`) |
| Evidência independente | CI no mesmo SHA: 39 check-runs = 37 success + 2 skipped, 0 fail; job `curriculum Node (18 projects)` = success — https://github.com/dandpb/aidevschool/actions/runs/34739373620/job/103676336687 (definição do job: `.github/workflows/ci.yml:415-431`) |

Registro datado por jornada (formato do plano §2.4):

- `02_key_value_store` — verified 2026-09-13 @ 05fca349 by docs-readiness-engineer — Node verde (install/lint/build/test exit 0; 3 arquivos / 33 testes; cobertura v8 All files 89.4% stmts / 92.26% branch / 100% funcs / 89.4% lines)
- `05_websocket_chat` — verified 2026-09-13 @ 05fca349 by docs-readiness-engineer — Node verde (install/lint/build/test exit 0; 2 arquivos / 10 testes)
- `12_distributed_job_scheduler` — verified 2026-09-13 @ 05fca349 by docs-readiness-engineer — Node verde (install/lint/build/test exit 0; 1 arquivo / 7 testes; cobertura v8 All files 91.2% / 83.33% / 96.42% / 91.2%)
- `18_search_engine` — verified 2026-09-13 @ 05fca349 by docs-readiness-engineer — Node verde (install/lint/build/test exit 0; 1 arquivo / 10 testes; `lint` = `tsc --noEmit`)

> Este arquivo é relatório datado de verificação (md puro; sem `.yaml` par — por isso inerte
> para `tools/cli.py check/enforce/render`, que só leem `assessments/*.yaml` — `tools/history.py:209`).
> Mudança de **status** no `curriculum/catalog.md` exige produtor ≠ verificador (plano §2.4):
> divergências abaixo viram issue para o dono do currículo; nada foi alterado no catálogo aqui.

## 1. Resultado bruto por jornada

### 02_key_value_store — catalog `catalog.md:77` → `Partially implemented`

| Claim do catálogo | Fonte | Re-verificação @ `05fca349` | Resultado |
| --- | --- | --- | --- |
| Node gated & certified (spec/tests/review/benchmark/evolution/verifier) | `catalog.md:78` | artefatos presentes: `docs/{spec,code_review,evolution_report,benchmark_results,arena_report,learning_notes,quiz,status}.md`; testes `tests/{store,server,mutation}.test.ts` | **confirmado** (presença física) |
| "10/10 tests passing" | `catalog.md:85` | `npm run test` → `Test Files 3 passed (3)`, `Tests 33 passed (33)` | **divergente** — hoje são 33 testes em 3 arquivos (incl. `mutation.test.ts`, 23 testes); claim desatualizado, não falso |
| Cobertura 91.45% stmts / 82.01% branch / 100% funcs / 91.45% lines | `catalog.md:85` | `npm run test:coverage` (v8) → All files 89.4 / 92.26 / 100 / 89.4 (`log.ts` 0%, `types.ts` 0%, `server.ts` 95.89/94.93/100/95.89, `store.ts` 95.91/90.26/100/95.91) | **divergente** — números atuais registrados acima; sem maquiar |
| `tsc`/`eslint` clean | `catalog.md:85` | `npm run lint` exit 0; `npm run build` (tsc) exit 0 | **confirmado** |
| Go/Rust N/A (removidos em `1b0a309`) | `catalog.md:83-84` | `ls curriculum/02_key_value_store/` → não existem `go-impl/` nem `rust-impl/` | **confirmado** |

### 05_websocket_chat — catalog `catalog.md:127` → `scaffolded`

| Item | Resultado @ `05fca349` |
| --- | --- |
| install/lint/build | exit 0 / exit 0 / exit 0 |
| test | `Test Files 2 passed (2)`, `Tests 10 passed (10)` (`tests/{chatHub,config}.test.ts`) |
| Artefatos | `docs/{spec,code_review,evolution_report,benchmark_results,status}.md` presentes |
| Divergência | catálogo diz `scaffolded`, mas a jornada tem implementação Node verde com testes e artefatos — **status subestima o estado real**; mudança cabe ao dono do currículo |

### 12_distributed_job_scheduler — catalog `catalog.md:230` → `scaffolded`

| Item | Resultado @ `05fca349` |
| --- | --- |
| install/lint/build | exit 0 / exit 0 / exit 0 |
| test (vitest run --coverage) | `Test Files 1 passed (1)`, `Tests 7 passed (7)`; All files 91.2% / 83.33% / 96.42% / 91.2% |
| Artefatos | `docs/{spec,code_review,evolution_report,benchmark_results,status}.md` presentes |
| Divergência | idem 05 — `scaffolded` subestima; implementação Node verde com cobertura no próprio `npm run test` |

### 18_search_engine — catalog `catalog.md:320` → `scaffolded`

| Item | Resultado @ `05fca349` |
| --- | --- |
| install/lint/build | exit 0 / exit 0 / exit 0 (`lint` = `tsc --noEmit` — não há eslint neste projeto) |
| test | `Test Files 1 passed (1)`, `Tests 10 passed (10)` (`tests/search.test.ts`) |
| Artefatos | `docs/{spec,code_review,evolution_report,benchmark_results,status}.md` presentes |
| Divergência | idem 05 |

Último commit que tocou as 4 jornadas: `436f41b296c3a607372c1b2d3bb167f5c0c756b0` (merge PR #233,
2026-09-02T03:59:16Z) — ou seja, o estado verificado hoje é ≥12 dias estável no disco.

## 2. Evidência independente (CI no mesmo SHA)

Commit `05fca349` (main, merge PR #372): 39 check-runs = **37 success + 2 skipped, 0 fail**
(`propose readiness re-grant PR` e um job dependente de PR, ambos `skipped` por design).

- `curriculum Node (18 projects)` — success — https://github.com/dandpb/aidevschool/actions/runs/34739373620/job/103676336687
  (executa `npm install` + `npm run lint` + `npm run test` + `npm run build` para cada `curriculum/[0-9][0-9]_*/node-impl`; `.github/workflows/ci.yml:415-431`)
- `curriculum Go` / `curriculum Rust` — success no mesmo SHA (só 01_rate_limiter tem go-impl/rust-impl)

## 3. Lacunas reportadas (sem maquiar — viram issue, não edit)

1. `catalog.md:85` (02): claim "10/10 tests" e cobertura 91.45/82.01/100/91.45 estão desatualizados
   frente ao disco (33 testes; 89.4/92.26/100/89.4 v8). Correção do texto é do dono do currículo.
2. `catalog.md:127/230/320` (05/12/18): `scaffolded` subestima — as três têm implementação Node
   verde (lint/build/test) + artefatos completos em `docs/`. Reclassificação é do dono do currículo,
   com barreira produtor ≠ verificador.
3. Linhas stale da matriz (`os-voxel-guided-missions`, `minitown-explore-only`): re-grant é dos
   owners de engine (`codexdojo-os-prototype`, `miniTown`) — escalada prevista na Wave 2 (plano §5).

## 4. Veredito

As 4 jornadas da Wave 1 têm agora status Node **fresco, datado e rastreável**: tudo verde em
execução local determinística e corroborado pelo CI no mesmo SHA. Divergências de claim do catálogo
(1 desatualizado, 3 subestimados) foram reportadas como lacunas — nenhuma mudança de status foi
aplicada por este papel.
