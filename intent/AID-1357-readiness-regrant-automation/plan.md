# Plan: fábrica de PR de re-grant pós-merge (AID-1357, Opção A)

Change-id: AID-1357-readiness-regrant-automation · From: intent.md + spec.md (mesmo
diretório) · Status: amended r2 (veredito AID-1359 GO CONDICIONADO: B1a incorporado,
F1/F2 corrigidos, R1-R5 aceitos) · awaiting plan gate (confirmação reemitida sobre a
rev r2; build não inicia antes do aceite — AGENTS.md "nothing is implemented without
an accepted plan")

## Files that change

1. `docs/product-readiness/tools/regrant.py` (novo) — `require_regrant_branch()`
   (guard: branch corrente != `main` **e** != detached HEAD, via
   `git branch --show-current`; R2) e `classify_proposal(proposal)` → `Written |
   PendingObservation(checklist) | Defect(reasons)`; conjunto producer-only idêntico
   ao de `enforcement.unsupported_candidate_reasons` (razões
   `scenario X lacks independent evidence` / `missing promoted result for X`).
2. `docs/product-readiness/tools/cli.py` (edit) — branch de argumentos
   `regrant --propose --input FILE` (antes dos branches existentes; reusa
   `load_assessment_request` + `propose_assessment`); exits: 0 escrita
   (`write_assessment` + `write_views`, par `assess --input`+`render`),
   3 pending-observation sem writes, 1 inválido, 2 guard/uso; usage atualizado
   **documentando exits 2 e 3** (R4).
3. `.github/workflows/readiness-regrant.yml` (novo) — `workflow_run` (CI, completed,
   push@main, failure) → checkout `head_sha` → download `*-readiness-$SHA`
   (run-id do `workflow_run.id` **+ `github-token: ${{ github.token }}`** explícito
   — R3; merge-multiple, 2 tentativas) → aggregate (id
   `<YYYY-MM-DD>-<sha8>-auto-regrant`) → gate re-executado (`check` OU `enforce`
   falho; verde → exit 0 silencioso) → dedupe label `readiness-regrant` →
   `git checkout -B regrant/auto-<YYYYMMDD>-<sha8>` → `regrant --propose` (exit 3
   esperado; exit 1 → abort sem PR; exit 0 → segue com commit, PR completo) →
   commit snapshot → push → `gh pr create` (title
   `docs(readiness): auto re-grant vN @ <sha8>`, vN = contagem de assessments
   `*regrant*` + 1; labels `readiness-regrant`, `bot`) → corpo com gate vermelho,
   checklist pendente, passos de countersign, §PRs automatizados, "bot não mergeia"
   **e nota B1** ("PR de GITHUB_TOKEN não dispara CI; o watchdog faz close+reopen
   para disparar os checks"). Perms `contents: write`, `pull-requests: write`,
   `actions: read`; `concurrency: readiness-regrant-factory`.
4. `docs/product-readiness/tests/test_regrant.py` (novo) — spec §3 (guard main +
   detached HEAD em repo git tmp; pending-observation sem writes; defect exit 1;
   caminho de escrita em branch descartável com restauração determinística e skip
   se árvore suja; **teste de contrato R1**: todo use case tem ≥1 cenário com
   assertion não-playwright — protege a propriedade que impede o bot de escrever).
5. `docs/product-readiness/REGRANT-RUNBOOK.md` (edit) — seção "Fluxo automatizado
   (Opção A)": lifecycle do PR bot (incl. **B1a**: PR de GITHUB_TOKEN nasce sem CI;
   watchdog faz close+reopen com credencial de agente para disparar
   `pull_request[reopened]`; **regra do zumbi**: sem checks após 45 min → close com
   motivo §recusa para liberar a dedupe), passos QA na branch (observação →
   `aggregate --observations` → `regrant --propose` → countersign), regra de dedupe,
   §recusa, fallback manual se GITHUB_TOKEN não puder abrir PR.
6. `intent/AID-1357-readiness-regrant-automation/` (novo — esta cadeia).

## Order of work

1. **Gate zero (este heartbeat)**: branch + intent/spec/plan committed e pushed;
   spec review despachada ao System Designer (bb7b8143, issue-filha); plan gate
   `request_confirmation` (idempotencyKey `confirmation:AID-1357:plan:<revisionId>`);
   AID-1357 `in_progress` com caminho de continuação = aceite do owner + veredito de
   spec.
2. Build (pós-aceite): `regrant.py` + `cli.py` → `test_regrant.py` vermelho→verde →
   workflow YAML (validar `yaml.safe_load` + actionlint se disponível) → runbook.
3. Self-verify local: `python3 -m pytest docs/product-readiness/tests -q` (suíte
   integral); `cli.py check` exit 0 no HEAD; smoke do guard em repo tmp; YAML parse;
   revisão REVIEW.md (passes do diff).
4. PR `main` ← branch; CI do head verde (incl. `sdlc-guards`); **verificação de
   primeiro-run**: confirmar que o workflow aparece como válido e que o setting de PR
   por GITHUB_TOKEN não bloqueia (se bloquear: registrar fallback + follow-up, sem
   novo secret sem aprovação CEO).
5. Countersign QA Lead (ca6a3f95) contra plan.md (issue-filha de verificação);
   receita no PR + AID-1357 → `in_review`; merge single-writer CEO citando o
   countersign; pós-merge: **armar o watchdog do carrier AID-1357** (varre PRs
   `readiness-regrant`: dispatch QA, close+reopen B1a se sem checks, zumbi → close
   com motivo) e acompanhar o primeiro evento real; se nenhum merge de conteúdo
   ocorrer, dry-run documentado via `workflow_dispatch` de simulação (sandbox:
   branch descartável, sem PR) + registro no runbook.
6. Desfecho: AID-1357 `done` com evidências (PR, countersign, primeiro ciclo real ou
   dry-run); AID-1308 (parent, `in_review`) atualizado com o outcome.

## Risks

- **B1 resolvido por desenho (AID-1359)**: PR de `GITHUB_TOKEN` não dispara CI →
  close+reopen pelo watchdog com credencial de agente dispara
  `pull_request[reopened]` (types default; ci.yml l.14 sem filtro) → checks
  required reportam; zumbi (>45 min sem checks) → close com motivo libera a
  dedupe. Residual: se o setting do repo bloquear PR de `GITHUB_TOKEN`, o primeiro
  run falha visível → fallback manual do runbook + follow-up (novo secret só com
  aprovação CEO).
- **Exit 3 é contrato novo** — documentado no usage (R4) + runbook + PR body;
  workflow o trata como sucesso-do-passo (qualquer outro código != 0/3 aborta).
- **Guard baseia-se no nome `main`** — default branch do repo é `main`; mudança de
  default branch exige revisão do workflow + guard (registrado no runbook). R2
  cobre detached HEAD.
- **Escrita do teste 4 muta a árvore real** — restauração determinística + skip se
  árvore suja; CI roda em checkout limpo (R5 aceito pelo veredito).
- **Watchdog é cadenciado, não instantâneo** — latência de despacho QA ≈ cadência
  do monitor (aceitável: horas → minutos/cadência; registro no runbook).
- **Propriedade "todo use case tem ≥1 cenário não-playwright" é dos dados, não do
  schema** — guarda vira teste de contrato R1 (use case 100% playwright novo quebra
  o build em vez de habilitar o bot a escrever).

## Proof (planejado)

- Suíte pytest integral verde + test_regrant.py novo cobrindo os 4 caminhos do
  subcomando (exit 0/1/2/3).
- `cli.py check` exit 0 no HEAD do PR; workflow YAML parseável; actionlint limpo (se
  disponível no ambiente).
- CI do PR head verde (todos os jobs required).
- Countersign QA + merge single-writer CEO citando countersign (mensagem de merge).
- Evidência operacional: primeiro PR auto-abierto em merge de conteúdo real OU
  dry-run `workflow_dispatch` documentado.
