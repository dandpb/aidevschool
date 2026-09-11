# QA Receipt — AID-1339 — Countersign re-anchor v44 dojoToday (PR #337)

- **Veredito: GO** (substância QA integralmente verde) **com 1 condição pré-merge** (guardrails trailer — ver abaixo).
- QA Lead (ca6a3f95), heartbeat 2026-09-10T21:4x–21:5xZ. Ambiente: node v24.18.0, Python 3.13.5, worktrees detached em `/paperclip/tmp/aid1339/wt*` (nada tocado na checkout canônica além deste dir não-rastreado).

## Árvore verificada (first-hand)

- PR #337 `fpe/aid-1334-readiness-v44`: `473e3c66` (hunk a11y do #335) → `80c3105f` (guarda CSS) → `53792bed` (head, docs-only + bump de teste).
- Diff `d0cfcdb8..80c3105f` auditado: exatamente `engines/dojoToday/src/main.ts` (+5/−1: aria-expanded/aria-controls + 3 syncs em toggle/salvar/nudge-fallback) e `engines/dojoToday/src/styles.css` (+6: `.socrates-config[hidden]{display:none}` com comentário). Zero edição de specs/claims.
- Diff `80c3105f..53792bed` auditado: só docs/ (README, assessments v44, evidência, results.ndjson) + `docs/product-readiness/tests/test_elevation_supersession.py` (constante `LATEST_ASSESSMENT_ID` v39→v44 — bump mecânico; padrão histórico v35→v36→v37→v38→v39 confirmado via `git log -L`).

## Verificações executadas

| # | Verificação | Resultado |
| --- | --- | --- |
| 1 | Producer gates @ `80c3105f`: `npm run test:readiness` | selfcheck OK + Playwright **23/23** (8.0s) + readiness-report emitido |
| 2 | Walk independente (scripts arquivados v44 reexecutados, cópia local `walk-a1339-qa-local/`, `A1334_EV_DIR`/`A1334_LOG_PATH` → dirs próprios) | **1/1 passed** — 3 jornadas + aria #335 (toggle/salvar/nudge-fallback) + guarda CSS; 7 screenshots + log em `_work-products/AID-1339/` |
| 3 | Controle negativo @ `473e3c66` (sem a guarda CSS; probe próprio na porta 5190) | Bug **reproduzido**: painel `#soc-config` VISÍVEL com `aria-expanded="false"` → fix é necessário, mínimo (1 regra) e o walk é detector real |
| 4 | `python3 -m learner.substrate` @ `80c3105f` | 30 projeções regeneradas; **diff rastreado = 0** |
| 5 | `python3 docs/product-readiness/tools/cli.py check` @ `53792bed` | **exit 0** ("sources and generated matrix are valid and in sync") |
| 6 | `python3 -m pytest docs/product-readiness/tests -q` @ `53792bed` | **36/36 passed** |
| 7 | Simulação de merge `origin/main` (`07247bf5`) + head (`53792bed`) → commit `89d06c10` (commit-tree, não pushado) | cli **exit 0** + pytest **36/36** → estado `behind` (só docs `intent/` na main) **não** invalida o re-anchor |
| 8 | CI real no head `53792bed` (API GitHub) | `dojoToday (TS + substrate)` success; `product readiness (claims)` **success** (DRIFT do #335 resolvido); `SDLC guardrails (diff)` **failure** (ver condição) |

## Condição pré-merge (blocker de processo, não de substância)

- `SDLC guardrails (diff)` FAILURE: `protect-tests: docs/product-readiness/tests/test_elevation_supersession.py` — edição de teste existente na mesma mudança que altera código por ele checado.
- Mecanismo documentado (`scripts/sdlc_guard_check.sh:99`): trailer `SDLC-ALLOW-TEST-EDIT: AID-<n>` no range de commits, citando issue AID que registra a aceitação do owner. Precedente: o próprio v39 (`f72913fc`) usou `SDLC-ALLOW-TEST-EDIT: AID-1096` para este mesmo arquivo.
- Remediação mínima (FPE, sem rewrite): commit vazio no branch do PR com o trailer na mensagem (ex.: `SDLC-ALLOW-TEST-EDIT: AID-1334`), aceitação do CEO registrada na AID-1334/AID-1339 → CI re-roda no head novo (mesma árvore → claims/dojoToday permanecem verdes) → guardrails verde → **merge imediato single-writer CEO** (nada aterra na main; fingerprints por conteúdo de arquivo não mudam).
- Disciplina preservada: sem isso, o CEO estaria mergearndo PR vermelho — exatamente o que AID-1136 Registro #7 proíbe para o #335.

## Limitações

- Evidência de walk reexecutada em ambiente QA local (mesmo harness Playwright arquivado); screenshots/logs próprios arquivados aqui.
- Não mergear PR #337 nem #335 (fora do escopo QA; single-writer CEO / founder merge pós-rebase).
