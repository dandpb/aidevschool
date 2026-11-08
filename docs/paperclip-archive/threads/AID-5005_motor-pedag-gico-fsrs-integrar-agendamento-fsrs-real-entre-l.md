# AID-5005: MOTOR PEDAGÓGICO FSRS: Integrar agendamento FSRS real entre learner/substrate, minimaxDojo e dojoToday

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** Learning Engine Engineer | **Created:** 2026-10-17T16:22:01.769084+00:00 | **Updated:** 2026-11-01T14:11:50.811+00:00
- **ID:** `4bbca3e0-4747-42e4-9896-a20bfc178ff1`

## Description

Garantir que a conclusão verificada de lições e práticas guiadas atualize os cartões FSRS (`stability`, `difficulty`, `due`) via `learner/substrate` e reflita imediatamente na fila diária de revisão do `engines/dojoToday` e `engines/codexdojo-os-prototype` com testes ponta a ponta.

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-5005 — MOTOR PEDAGÓGICO FSRS: Integrar agendamento FSRS real entre learner/substrate, minimaxDojo e dojoToday
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 92e3a905-6758-4f4d-8190-ca38918ef7c3
- Agent: Learning Engine Engineer (opencode_local)

## Objective

Garantir que a conclusão verificada de lições e práticas guiadas atualize os cartões FSRS (`stability`, `difficulty`, `due`) via `learner/substrate` e reflita imediatamente na fila diária de revisão do `engines/dojoToday` e `engines/codexdojo-os-prototype` com testes ponta a ponta.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `92e3a905-6758-4f4d-8190-ca38918ef7c3` finished with status `succeeded` at 2026-10-19T17:50:39.653Z.
- Merge verified. Checking main's post-merge CI and spot-checking the landed work.

Main is green (43✓, one straggler in-progress, zero failures) and all FSRS artifacts landed. Closing out.

AID-5005 is **done**. Final state:

- **Merged**: PR #712 → `main` at `4157850e` (17:44:12Z) via the single merge door by the FPE; merge commit cites the operative QA countersign.
- **Post-merge main**: 43✓ + 1 skipped + 1 straggler in-progress, zero failures; `practice.py`, `fsrs_bridge.py`, and the FSRS ADR all confirmed on main.
- **Review chain intact**: producer → QA GO (AID-5146) → forced branch update (strict protection) → QA re-GO (AID-5149) → FPE merge with receipt (AID-5151); superseded AID-5148 documented.
- **Board**: final acceptance comment posted (scope + invariant delivered); issue closed `done` at 17:50:26Z with monitor cleared.

## Files / Routes Touched

- `scripts/merge_pr.sh`
- `scripts/build-pilot-bundle.mjs`
- `scripts/readiness-report.mjs`

## Commands Run

- Heartbeat run `92e3a905-6758-4f4d-8190-ca38918ef7c3` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (12)

**?** · 2026-10-17T18:10:27.080068+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `process_lost` - Process lost -- server may have restarted. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `e658ce57-cd9b-4bf9-bdd3-aafdeafe38de`
- Recovery owner: [CEO](/AID/agents/501cb456-b786-4d67-b951-6c71e0f0915d)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:55.044218+00:00

PR #712 aberto com agendamento FSRS real e card state materializado.

**founder** · 2026-10-18T11:55:32.468641+00:00

Retomada gradual (1 agente de engenharia por vez no VPS): O PR #712 (`aid5005/fsrs-real-scheduling`, head `e066a469`) está quase 100% verde no CI, com apenas 2 falhas no job `Python (learner + curriculum shared)`:
- `FAILED learner/substrate/tests/test_judgments.py::test_no_client_is_byte_identical_to_golden`
- `FAILED learner/substrate/tests/test_substrate.py::TestPixelReviewSlice::test_slice_matches_snapshot_truth`
(Os novos campos `stability`, `difficulty`, `due` entraram em `dueReviews`, faltando atualizar o snapshot/golden correspondente ou preservar a projeção esperada + adicionar trailer `Provenance:` no corpo do PR #712). Ajuste e faça push na branch `aid5005/fsrs-real-scheduling`.

**founder** · 2026-10-18T12:21:44.264739+00:00

Retomada gradual (2 agentes ativos por vez): O PR #712 (`aid5005/fsrs-real-scheduling`, head `1b182327`) ficou com todos os testes verdes, mas entrou em conflito de merge (`CONFLICTING/DIRTY`) após os últimos merges na `main` (`22b272a8`). Faça rebase/merge de `origin/main` na branch `aid5005/fsrs-real-scheduling`, regenere `python3 -m learner.substrate` se necessário, garanta o trailer `Provenance:` no corpo do PR #712 e faça push.

**Learning Engine Engineer** · 2026-10-18T12:25:50.461916+00:00

## AID-5005 — conflito de merge do PR #712 resolvido (head `cc41ba07`)

Ação do comentário de 12:21 executada na íntegra:

1. **Rebase/merge**: `origin/main` (`22b272a8`) mesclado em `aid5005/fsrs-real-scheduling` (merge commit `23e106d2`). Único conflito em `engines/codexDojo/ecosystem/MANIFEST.md` — seções aditivas dos dois lados preservadas (Dev-family projected content identity + Guided-practice scheduling boundary).
2. **Regeneração**: `python3 -m learner.substrate` → 31 views; apenas os snapshots `learner.ts` de codexDojo/codexdojo-os-prototype mudaram (dreyfus `competent`→`proficient`, P-001 occurrences `21`→`1`) — consequência determinística do estado canônico trazido da main; valores válidos nas uniões de tipo (`domain.ts`). Commit `cc41ba07`.
3. **Provenance**: trailer `Provenance: agent=learning-engine-engineer task=AID-5005 run=6326b215...` já presente no corpo do PR #712 (confirmado, sem edição necessária).
4. **Push**: `1b182327..cc41ba07` em `aid5005/fsrs-real-scheduling`.

### Evidência de verificação (pós-merge)

- `python3 -m unittest discover -s learner/substrate/tests` → **237 tests OK** (6 novos vindos da main)
- `python3 -m unittest discover -s engines/minimaxDojo/tests` → **59 OK** (1 skip pré-existente)
- `node --test engines/codexdojo-os-prototype/scripts/guided-practice-source-order.test.mjs` → **4/4 pass** (suite nova da main, intacta no merge)
- PR #712: head `cc41ba07`, `mergeable: true`, `mergeable_state: blocked` (= aguardando checks de CI + review, caminho normal até o merge pelo FPE)

### Próximo passo

Review formal do PR #712 (countersign + merge via `scripts/merge_pr.sh` pelo FPE, política R1). Nenhum push/merge em `main` foi realizado por este agente.

**founder** · 2026-10-18T12:29:10.613648+00:00

O merge commit `cc41ba07` no PR #712 resolveu o conflito e passou nos testes, mas o `SDLC guardrails (diff)` lê apenas `git log -1 --format=%B HEAD` e exige o trailer `SDLC-ALLOW-TEST-EDIT: AID-5005` na mensagem do commit HEAD (`cc41ba07`). Faça `git commit --amend` no commit HEAD da branch `aid5005/fsrs-real-scheduling` adicionando a linha `SDLC-ALLOW-TEST-EDIT: AID-5005` e faça push (`--force-with-lease`).

**Learning Engine Engineer** · 2026-10-18T12:30:32.979002+00:00

## AID-5005 — trailer SDLC aplicado ao HEAD do PR #712 (`4fa80bc8`)

Ação do comentário 12:29 executada:

1. **Amend**: `git commit --amend` em `cc41ba07` adicionando a linha `SDLC-ALLOW-TEST-EDIT: AID-5005` à mensagem do commit HEAD (conteúdo do commit inalterado: apenas os 2 snapshots `learner.ts` regenerados). Novo head: `4fa80bc8`.
2. **Push**: `--force-with-lease` com expectativa explícita `cc41ba07` (primeira tentativa rejeitada por "stale info" — tracking ref ausente; lease explícito garantiu que nenhuma escrita concorrente foi sobrescrita; remote confirmado em `cc41ba07` antes do force). Remote agora em `4fa80bc8`.
3. **PR #712**: head `4fa80bc8`, `mergeable: true`, `mergeable_state: behind` (a `main` avançou para `a22112a8`; sem conflito). 27 checks em fila.

**Nota para o merge (FPE)**: o guardrail lê apenas `git log -1 --format=%B HEAD` — se for necessário igualar a branch à `main` antes do merge, o commit de merge seguinte deve incluir o mesmo trailer `SDLC-ALLOW-TEST-EDIT: AID-5005` na mensagem, senão o check volta a falhar.

Monitor mantido (próxima checagem 15:45Z, `wake_owner`): CI do PR #712 + countersign/merge pelo FPE (política R1). Nenhum push/merge em `main`.

**Learning Engine Engineer** · 2026-10-19T17:14:56.685414+00:00

## AID-5005 — diagnóstico do countersign-gate + encaminhamento de revisão

**Estado verificado 1º-mão (2026-10-19T17:1xZ):** PR #712 aberto, head `4fa80bc8`, CI **43✓ + 2 skipped**, único vermelho = `countersign-gate` com:
`producer unattributed: no 'Provenance: agent=… task=… run=… session=…' trailer in the PR body or any comment` (AID-2768 §5).

**Causa:** o trailer no corpo do PR tem 3 campos (sem `session=`) — antecedia o requisito de 4 campos (§4). Não era um "review rejeitado"; era atribuição de produtor ausente.

### Ações tomadas (este heartbeat)

1. **Registro de produtor** postado no PR #712 (GH cmt `6272894278`) com trailer canônico completo: `Provenance: agent=learning-engine-engineer task=AID-5005 run=7019d141-b8d2-43a8-a66b-0454fde98e6a session=ses_eb109e780ffelBi759pqs3SPBV` + pin do head `4fa80bc8…` para a citação.
2. **Rerun** dos jobs falhos solicitado (run `39127516636`).
3. **Child AID-5146** criado e asignado ao **QA Lead** (ca6a3f95) pedindo a citação independente `Countersign: AID-5005 verdict <v> head=4fa80bc8…` com trailer próprio de 4 campos e session ancorado ao run (§§1–8). Sem duplicação: nenhuma revisão nativa prévia existia para este head; evidência do produtor documentada como re-executável, sem novo round de testes.
4. Nota operacional registrada: se a branch precisar igualar à main antes do merge, o commit de merge deve **re-carregar** o trailer `SDLC-ALLOW-TEST-EDIT: AID-5005` (guardrail lê apenas `git log -1`).

### Disposição

`in_review` — caminho: countersign QA via AID-5146 → gate verde → merge pela porta única `scripts/merge_pr.sh` (FPE, política R1) → fechamento. Monitor rearmado para conferir progresso.

**Learning Engine Engineer** · 2026-10-19T17:16:29.500487+00:00

**Update (17:16Z):** causa-raiz do "producer unattributed" corrigida — o gate remove code fences antes de escanear; registro válido re-postado como linha simples (GH cmt `6272938287`). Reprodução local: produtor atribuído, única pendência agora é a citação QA (§1) via AID-5146, já instruída sobre o mesmo detalhe de fence. Disposição mantida: in_review, monitor 21:00Z.

**Learning Engine Engineer** · 2026-10-19T17:29:32.876972+00:00

## AID-5005 — GO recebido em 4fa80bc8; branch atualizada (strict protection) → novo head `87feca8d` aguardando re-countersign

**Verificado 1º-mão:** child AID-5146 concluído pelo QA Lead com citação operativa GO (cmt `6273080625`, 17:23:49Z). Reproduzi o gate localmente com o resolver configurado: **PASS** (produtor ≠ countersigner, head pinado, session ancorada, sem VOID/HELD). Após rerun, CI no `4fa80bc8` ficou **44✓ + 2 skipped** (countersign-gate verde).

**Por que o head moveu:** branch protection `strict: true` (confirmado via API) — a porta única recusaria branch behind (precedente PR #709/AID-5077). Fluxo do produtor executado:

1. Merge `origin/main` (`5a0ce719`, inclui #709 verdict-fallback fail-closed) → head `87feca8d58ba4291a6517c97606a3c331bbe69c4`.
2. Regen substrate: único delta semântico `01_rate_limiter` `passed: true→false` nos 2 `learner.ts` (consequência de #709, sem mudança de código do PR).
3. Trailer `SDLC-ALLOW-TEST-EDIT: AID-5005` re-carregado na mensagem do merge commit (guardrail lê `git log -1`).
4. Evidência pós-merge: substrate **237 OK**, minimaxDojo **59 OK**, node source-order **4/4**.

**Encaminhamento:** re-countersign pedido ao QA Lead via **AID-5149** (suplanta AID-5148, criado com corpo corrompido por erro de shell no meu write — transparência; boundary impediu correção in-place). Delta a re-verificar é só merge main→head + regen; bateria de `4fa80bc8` não precisa repetir. Depois: merge **somente** pela porta única `scripts/merge_pr.sh` (FPE/política R1).

**Disposição:** `in_review` — caminho vivo: AID-5149 (QA já `in_progress`) → gate verde no head novo → merge pela porta → fechamento. Monitor 21:00Z mantido.

**Learning Engine Engineer** · 2026-10-19T17:38:55.485659+00:00

## AID-5005 — GO fresco aplicado: gate verde no head `87feca8d`; merge encaminhado ao FPE (AID-5151)

**Verificado 1º-mão:** re-countersign concluído (AID-5149 done; AID-5148 formalizada como suplantada). Citação operativa fresca: GH cmt `6273325257` (17:36:04Z, QA Lead) `Countersign: AID-5005 verdict GO head=87feca8d58ba…`, pin no head atual.

**Gate revalidado:** o check-run no head vinha de 17:28Z (anterior à citação) — rerun solicitado e concluído: `countersign-gate` **success** (17:37:19Z). CI no head exato: **44✓ + 2 skipped, 0 falhas**. PR `mergeable: true`, base `5a0ce719` contida no head (strict satisfeito).

**Encaminhamento final:** child **AID-5151** asignado ao **FPE** (fa8130d5) pedindo o merge pela porta única `scripts/merge_pr.sh 712 --merge` (política R1 — produtor não mergea). Após o merge, o FPE posta o recibo (nº do merge commit) e eu fecho o AID-5005 com o aceite final.

**Disposição:** `in_review` — caminho vivo: merge AID-5151 (FPE) → recibo → fechamento pelo produtor. Monitor 21:00Z mantém.

**Learning Engine Engineer** · 2026-10-19T17:50:26.860598+00:00

## AID-5005 — ACEITE FINAL: PR #712 merged em `main` (`4157850e`) — objetivo cumprido

**Verificado 1º-mão (produtor, 2026-10-19T17:5xZ):**

- PR #712 **merged** às 17:44:12Z pela porta única (`scripts/merge_pr.sh`); merge commit `4157850e65f7ddaa2f11f79dccf661b2abc5a0e9` cita a linha de countersign operativa (AID-2768).
- **Main pós-merge: 43✓ + 1 skipped + 1 straggler in-progress, 0 falhas** no `4157850e`.
- Artefatos confirmados em `main`: `learner/substrate/practice.py`, `engines/minimaxDojo/core/fsrs_bridge.py`, ADR `engines/minimaxDojo/docs/08_fsrs_practice_gate.md`, card state (`stability`/`difficulty`/`due`) nas views e snapshots.

### Escopo efetivamente aceito (invariante entregue)

> Dada uma conclusão verificada de lição/prática guiada, o cartão FSRS avança exatamente uma revisão com card state observável; `mastered` permanece `false` em prática; a fila diária (`dojoToday` + snapshots codexdojo) reflete o novo `due` na próxima derivação — testado ponta a ponta (substrate 237, minimaxDojo 59, e2e herméticas), com verificação independente do QA Lead em dois heads (`4fa80bc8` GO, `87feca8d` GO re-countersign) e merge pelo FPE (recibo AID-5151).

### Cadeia de review (sem duplicação)

Implementação (produtor) → QA GO #1 (AID-5146, head `4fa80bc8`) → update-branch obrigatório (strict) → QA GO #2 (AID-5149, head `87feca8d`) → merge FPE (AID-5151, recibo completo). AID-5148 formalizada como suplantada; AID-5076 (revisão de produtividade) sem achados.

### Encerramento

Todos os filhos concluídos; nenhum pendência remanescente deste escopo. Monitor será desarmado com o fechamento. Issue → **done**.

---

