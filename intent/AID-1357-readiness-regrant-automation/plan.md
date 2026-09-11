# Plan: fábrica de PR de re-grant pós-merge (AID-1357, Opção A)

Change-id: AID-1357-readiness-regrant-automation · From: intent.md + spec.md (mesmo
diretório) · Status: awaiting plan gate (`request_confirmation` ao owner; build não
inicia antes do aceite — AGENTS.md "nothing is implemented without an accepted plan")

## Files that change

1. `docs/product-readiness/tools/regrant.py` (novo) — `require_regrant_branch()`
   (guard: branch corrente != `main`, via `git branch --show-current`) e
   `classify_proposal(proposal)` → `Written | PendingObservation(checklist) |
   Defect(reasons)`; conjunto producer-only idêntico ao de
   `enforcement.unsupported_candidate_reasons` (razões
   `scenario X lacks independent evidence` / `missing promoted result for X`).
2. `docs/product-readiness/tools/cli.py` (edit) — branch de argumentos
   `regrant --propose --input FILE` (antes dos branches existentes; reusa
   `load_assessment_request` + `propose_assessment`); exits: 0 escrita
   (`write_assessment` + `write_views`, par `assess --input`+`render`),
   3 pending-observation sem writes, 1 inválido, 2 guard/uso; usage atualizado.
3. `.github/workflows/readiness-regrant.yml` (novo) — `workflow_run` (CI, completed,
   push@main, failure) → checkout `head_sha` → download `*-readiness-$SHA`
   (run-id do `workflow_run.id`, merge-multiple, 2 tentativas) → aggregate (id
   `<YYYY-MM-DD>-<sha8>-auto-regrant`) → gate re-executado (`check` OU `enforce`
   falho; verde → exit 0 silencioso) → dedupe label `readiness-regrant` →
   `git checkout -B regrant/auto-<YYYYMMDD>-<sha8>` → `regrant --propose` (exit 3
   esperado; exit 1 → abort sem PR; exit 0 → segue com commit, PR completo) →
   commit snapshot → push → `gh pr create` (title
   `docs(readiness): auto re-grant vN @ <sha8>`, vN = contagem de assessments
   `*regrant*` + 1; labels `readiness-regrant`, `bot`) → corpo com gate vermelho,
   checklist pendente, passos de countersign, §PRs automatizados, "bot não mergeia".
   Perms `contents: write`, `pull-requests: write`, `actions: read`;
   `concurrency: readiness-regrant-factory`.
4. `docs/product-readiness/tests/test_regrant.py` (novo) — spec §3 (guard main em
   repo git tmp; pending-observation sem writes; defect exit 1; caminho de escrita
   em branch descartável com restauração determinística; dry assertions de usage).
5. `docs/product-readiness/REGRANT-RUNBOOK.md` (edit) — seção "Fluxo automatizado
   (Opção A)": lifecycle do PR bot, passos QA na branch (observação →
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
   countersign; pós-merge: primeiro evento real monitorado (watchdog carrier
   AID-1357 varre PRs `readiness-regrant` e despacha QA) — se nenhum merge de
   conteúdo ocorrer, dry-run documentado via `workflow_dispatch` de simulação
   (sandbox: branch descartável, sem PR) + registro no runbook.
6. Desfecho: AID-1357 `done` com evidências (PR, countersign, primeiro ciclo real ou
   dry-run); AID-1308 (parent, `in_review`) atualizado com o outcome.

## Risks

- **GITHUB_TOKEN sem permissão de PR** → primeiro run falha visível; fallback
  manual no runbook; follow-up optional com approv de CEO (fora deste change).
- **Exit 3 é contrato novo** — documentado no usage + runbook + PR body; workflow
  o trata como sucesso-do-passo (qualquer outro código != 0/3 aborta).
- **Guard baseia-se no nome `main`** — default branch do repo é `main`; se algum dia
  mudar, o guard falha FECHADO (recusa na main nova? não: guard compara literal
  `main`; mudança de default branch exige revisão do workflow — registrado no
  runbook).
- **Escrita do teste 4 muta a árvore real** — restauração determinística + skip se
  árvore suja; CI roda em checkout limpo.
- **Watchdog é cadenciado, não instantâneo** — latência de despacho QA ≈ cadência do
  monitor (aceitável: horas → minutos/cadência; registro no runbook).

## Proof (planejado)

- Suíte pytest integral verde + test_regrant.py novo cobrindo os 4 caminhos do
  subcomando (exit 0/1/2/3).
- `cli.py check` exit 0 no HEAD do PR; workflow YAML parseável; actionlint limpo (se
  disponível no ambiente).
- CI do PR head verde (todos os jobs required).
- Countersign QA + merge single-writer CEO citando countersign (mensagem de merge).
- Evidência operacional: primeiro PR auto-abierto em merge de conteúdo real OU
  dry-run `workflow_dispatch` documentado.
