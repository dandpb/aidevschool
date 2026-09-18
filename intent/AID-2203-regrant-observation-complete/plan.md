# Plan: fábrica de re-grant emite proposta observation-complete (AID-2203)

Change-id: AID-2203-regrant-observation-complete · From: intent/AID-2203-regrant-observation-complete/spec.md · Status: accepted (GO CEO AID-2229 recibo 5df8dc86; aceite formal por delegação AID-2305 → AID-2306, 2026-09-17; doc gateado `plan` rev 6bf5ef39 inalterado)

## Files that change

1. `docs/product-readiness/tests/test_regrant_proposal_state.py` (novo) — escrito PRIMEIRO
   (failing-first): 4 casos da spec R4 (exit 3 manifest pending + zero writes de assessment;
   exit 0 manifest written + restauro determinístico + skip se árvore suja; sem flag → sem
   arquivo; exit 1/2 sem manifest). Reusa o padrão do `test_regrant.py`
   (`_regrant_write_branch`, `_current_report`, `_restore_tree` replicados autocontidos).
2. `docs/product-readiness/tools/regrant.py` (edit) — `write_proposal_state(outcome,
   request, path)`: serializa `Written|PendingObservation` + request (assessmentId, gitSha)
   + branch corrente em JSON estável (sort_keys); sem mudança em `classify_proposal`/guard.
3. `docs/product-readiness/tools/cli.py` (edit) — branch `regrant` aceita
   `[--proposal-state PATH]` (argv 4 ou 6; rejeita qualquer outro shape com exit 2);
   chama `write_proposal_state` nos caminhos exit 3 (antes do print) e exit 0 (antes das
   escritas); usage documentado.
4. `.github/workflows/readiness-regrant.yml` (edit) — propose com `--proposal-state
   docs/product-readiness/evidence/producers/$ASSESSMENT_ID/regrant-proposal.json`;
   step "ensure proposal labels exist" (2 labels novas); step "label the proposal"
   (exit 3 → pending, exit 0 → complete); commit inclui o manifest; corpo do PR ganha a
   linha de fast-path bloqueado por label.
5. `.github/workflows/readiness-regrant-complete.yml` (novo) — `pull_request
   [synchronize, reopened]` filtrado `head_ref ~ ^regrant/auto-` + `workflow_dispatch`
   (input `pr`); job `regrant observation completeness`: checkout merge-ref → pip install
   -e ".[dev]" → `cli.py check --require-current` → se verde: `gh pr edit` troca labels +
   comentário idempotente `regrant-observation-receipt`; se vermelho: adiciona label pending
   (retrofit, quando manifest não declara written) e falha o job (check nomeado vermelho).
   Perms `contents: read`, `pull-requests: write`; `concurrency: regrant-complete-${{ github.event.pull_request.number || inputs.pr }}`.
6. `docs/product-readiness/REGRANT-RUNBOOK.md` (edit) — §Fluxo automatizado: subseção
   "Observation-complete gate (AID-2203)": contract dos labels, check nomeado, fluxo
   completo, retrofit, nota revalidateBy, cross-ref AID-2202/#462. Seção distinta do diff
   do PR #462 (coordenação registrada).
7. `intent/AID-2203-regrant-observation-complete/` (novo — esta cadeia).

## Order of work

1. **Gate zero (este heartbeat)**: branch `fpe/aid-2203-regrant-observation-complete` +
   intent/spec/plan commitados e pushed; plan document publicado na issue AID-2203;
   `request_confirmation` (idempotencyKey `confirmation:AID-2203:plan:<revisionId>`,
   `wake_assignee_on_accept`); AID-2203 `in_progress` com continuação = aceite do gate.
   Nenhum código de produção escrito antes do aceite (AGENTS.md).
2. Build (pós-aceite): teste novo (vermelho) → `regrant.py`/`cli.py` (verde) → workflow
   edit → workflow novo → runbook.
3. Self-verify: `python3 -m pytest docs/product-readiness/tests -q` (suíte integral);
   `python3 docs/product-readiness/tools/cli.py check` exit 0 no HEAD; `yaml.safe_load`
   nos 2 workflows; REVIEW.md passes no diff; drill local do gate de completude em branch
   descartável (fixture: árvore com snapshot producer-only → check vermelho; após write
   simulado → verde) quando viável sem writes em `main`.
4. PR `main` ← branch; CI head verde (incl. `sdlc-guards`); comentário de coordenação com
   PR #462 (rebase se preciso).
5. **Countersign QA fresh-context pré-merge** (classe autoridade de processo —
   docs/sdlc/README.md): issue-filha de verificação atribuída ao QA Lead (ca6a3f95) contra
   este plan; recibo no PR + AID-2203 → `in_review`.
6. Merge single-writer CEO citando o countersign; pós-merge: acompanhar o primeiro ciclo
   real da fábrica (próxima janela stale) OU drill `workflow_dispatch` documentado (padrão
   AID-1669); AID-2202 atualizada com o outcome (Opção 2 entregue).
7. Desfecho: AID-2203 `done` com evidências (PR, countersign, primeiro ciclo/drill, recibo
   AID-1516 com porcelain first-hand).

## Risks

- **Riscoso: workflow novo (R3)** — eventos `pull_request` dependem de pushes com credencial
  de agente (B1): nascimento do PR de GITHUB_TOKEN não dispara; mitigido pelo close+reopen
  do watchdog (reopened dispara) e pelo drill `workflow_dispatch`. Se o watchdog não
  reabrir, o check novo não reporta — o estado continua o de hoje (sem sinal), nunca pior.
- **Label-swap por GITHUB_TOKEN**: sinal necessário, não suficiente (countersign QA
  permanece); registrado no runbook e na spec (concern 1).
- **`check --require-current` vermelho por revalidateBy** (não por staleness): fail-closed
  correto; nota no runbook.
- **Conflito de runbook com #462**: seções distintas; rebase do segundo.
- **Alternativas NÃO escolhidas**: (a) bot executar a observação — viola producer ≠
  verifier e a natureza julgamental das assertions; (b) relaxar AID-1891 determinismo na
  PR-lane para re-vermelhar proposals — regressão de flapping já derrotada (AID-1890);
  (c) branch protection/up-to-date — pendência CEO pré-existente (runbook); (d) secret
  Paperclip→GitHub — exige CEO (B1b), adiado com o concern 2.

## Proof (planejado)

- `python3 -m pytest docs/product-readiness/tests -q` → suíte integral verde, incluindo
  `test_regrant_proposal_state.py` novo (4 casos) e `test_regrant.py` intocado passando.
- `python3 docs/product-readiness/tools/cli.py check` → exit 0 no HEAD do PR.
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/readiness-regrant.yml')); yaml.safe_load(open('.github/workflows/readiness-regrant-complete.yml'))"` → sem erro.
- Drill local do manifest: `regrant --propose --input <fixture automated> --proposal-state
  /tmp/x.json` em branch regrant/test → exit 3 + JSON `pending-observation` com checklist;
  árvore sem writes.
- CI do PR head verde (todos os jobs required, incl. `sdlc-guards`).
- Evidência operacional pós-merge: primeiro PR auto-abierto com label pending + check
  vermelho nomeado, OU drill `workflow_dispatch` documentado (padrão AID-1669).
- Countersign QA pré-merge + merge single-writer CEO citando o countersign.

## Verification split

- **Producer (esta sessão FPE)**: build + suíte pytest + YAML parse + drill local + REVIEW.md
  passes + PR.
- **Verificador independente (pré-merge)**: countersign QA fresh-context (ca6a3f95) contra
  este plan — obrigatório (diff toca autoridade de processo).
- **Verificador final (pós-merge)**: push-run da main + primeiro ciclo real da fábrica
  (ou drill documentado); auditoria SDLC da próxima janela confere a métrica
  repeat-incident.

## Addendum r1.1 (2026-09-17, pós-GO — delta de coordenação R5, sem bump de revisão)

Contexto mudou após o GO CEO (AID-2229 recibo `5df8dc86`, espelhado no comentário
`5ae96c6b` desta issue): o **PR #462** (Opção 1 / AID-2202/AID-2204) foi **fechado por
supersede às 23:01:55Z** (desfecho entregue via #461→#468; main `a95c4b343b` verde
first-hand: 28 success / 2 skipped / 0 failure). Decisão CEO (relay AID-2232/AID-2202):

- **R5 passa a incluir** a regra docs remanescente da Opção 1 no lote de runbook DESTA
  issue, em seções distintas: single-writer item 5 + seção "re-grant emparceirado no
  mesmo lote" (conteúdo do #462, citado como closed-by-supersede) + cross-ref no
  parágrafo do trailer `SDLC-ALLOW-TEST-EDIT` em `docs/sdlc/README.md` (1 frase).
- **Nenhuma outra entrega do plan muda.** O GO cobre r1 + este delta.
- A confirmação pendente `e90e5c92` continua apontando para a rev `6bf5ef39` (doc `plan`
  inalterado); este addendo vive no artefato repo e na thread, não no doc gateado.
- Build permanece retido até o aceite formal de `e90e5c92` (board-only para agentes;
  espelho não é instrumento de aceite).
