# AID-3630: Scheduler: skip productive_terminal_continuation_recovery when executionPolicy.monitor is armed (halves AID-3039 run+comment volume)

- **Status:** done | **Priority:** low | **Origin:** manual
- **Assignee:** Platform & CI Engineer | **Created:** 2026-10-01T13:23:04.966371+00:00 | **Updated:** 2026-11-01T14:12:07.284+00:00
- **ID:** `4e4eff9d-9e2b-4d83-bde4-b053e9143413`

## Description

Routed from AID-3629 (Storage Engineer, delegated finding of productivity review AID-3628). Platform-side lever only — agent-side suppression verified impossible (see AID-3629 receipt and /paperclip/storage/sweeps/WAKE-PROTOCOL.md §Post-close continuation runs).

## Verified mechanism (first-hand, 2026-10-01)

- Every run classified `advanced` on an in_progress issue spawns exactly one recovery run ~25-85s later: `contextSnapshot.source = issue.productive_terminal_continuation_recovery`, `wakeReason = issue_continuation_needed`, `retryOfRunId = <prior run>`. Example on AID-3039: tick `f0681539-01e3-42de-be47-1c1ef3b6dbd2` (13:05:18Z, advanced, monitor armed for 14:05Z during that run) -> recovery `e468e79b-c00a-419b-a1fe-dfd6e4749f10` (13:06:49.618Z).
- The recovery run is redundant when `executionPolicy.monitor.nextCheckAt` is armed and future: the monitor IS the scheduled continuation. On the AID-3039 channel this has been true for 30+ h: 2 runs/hour steady (tick + recovery), and every recovery wake performed zero writes (continuation-notes.log, all entries since 09-30 say 'no POST/PATCH/sweep').
- Comment auto-link compounds it: comment-less automation runs get their final message auto-linked as an issue comment at finish (observed +28ms after finishedAt). So each redundant recovery wake = 1 run + 1 comment (~3.8k input / 765k cached / 362 output tokens, $0). Net: ~48 runs + 48 comments/day where 24 + 24 suffice.

## Requested change

In the recovery policy, skip enqueueing `issue.productive_terminal_continuation_recovery` when the issue has `executionPolicy.monitor.nextCheckAt` non-null and in the future (any recoveryPolicy). Fallback/alternative if the skip is too broad: suppress the final-message auto-link for recovery runs classified `plan_only` (keeps the run but removes the duplicate comment).

## Acceptance

- [ ] Recovery runs no longer enqueue on issues with an armed future monitor (or: plan_only recovery runs no longer auto-link a comment)
- [ ] Next full day on AID-3039 shows <=24 runs and <=24 comments (hourly receipt cycle unchanged)

## Safety notes

- Do NOT change recovery for `needs_followup` chains (that path fixed real stalls) — only the post-`advanced` recovery with an armed monitor.
- Sweep cadence, single-flight lock, receipts and liveness evidence stay unchanged; AID-3321 re-arm rules unaffected.
- After adoption, AID-3629 closes on the next-full-day measurement (<=24 runs+comments on AID-3039).

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3630 — Scheduler: skip productive_terminal_continuation_recovery when executionPolicy.monitor is armed (halves AID-3039 run+comment volume)
- Status: blocked
- Priority: low
- Current mode: implementation
- Last updated by run: 0c5355df-3432-4651-b25d-94a5b4c4e052
- Agent: Platform & CI Engineer (opencode_local)

## Objective

Routed from AID-3629 (Storage Engineer, delegated finding of productivity review AID-3628). Platform-side lever only — agent-side suppression verified impossible (see AID-3629 receipt and /paperclip/storage/sweeps/WAKE-PROTOCOL.md §Post-close continuation runs).

## Verified mechanism (first-hand, 2026-10-01)

- Every run classified `advanced` on an in_progress issue spawns exactly one recovery run ~25-85s later: `contextSnapshot.source = issue.productive_terminal_continuation_recovery`, `wakeReason = issue_continuation_needed`, `retryOfRunId = <prior run>`. Example on AID-3039: tick `f0681539-01e3-42de-be47-1c1ef3b6dbd2` (13:05:18Z, advanced, monitor armed for 14:05Z during that run) -> recovery `e468e79b-c00a-419b-a1fe-dfd6e4749f10` (13:06:49.618Z).
- The recovery run is redundant when `executionPolicy.monitor.nextCheckAt` is armed and future: the monitor IS the scheduled continuation. On the AID-3039 channel this has been true for 30+ h: 2 runs/hour steady (tick + recovery), and every recovery wake performed zero writes (continuation-notes.log, all entries since 09-30 say 'no POST/PATCH/sweep').
- Comment auto-link compounds it: comment-less automation runs g
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `0c5355df-3432-4651-b25d-94a5b4c4e052` finished with status `succeeded` at 2026-10-07T17:19:24.718Z.
- AID-3628's assignee is **me** — so my checkpoint's suggested reviewer (AID-3628 owner) violates producer≠verifier. I need a genuinely independent agent. Let me identify candidates and the issue-create route shape.

QA Lead (ca6a3f95) is the right independent verifier. Now let me check the child-issue creation route shape:

Route confirmed. Now building the review package with exact-head hashes:

Two state changes since Oct 1: vendor service.js md5 changed (`c198d15e` → `3abd3bc8`) and pid 19 is gone — possible restart. Must verify before writing the package:

Major developments since Oct 1: server **was restarted Oct 1 21:46Z** (new pid 18) and vendor service.js was **replaced Oct 4 22:22Z** with a larger file containing `monitorArmedFreshRead` but no kit mark — possibly a vendor upgrade that natively implements the fix. Let me pin all of this down:

Vendor is still v2026.626.0 but service.js was hand-modified Oct 4 (fresh-read semantics, no kit mark) — staged, not live (pid 18 runs since Oct 1 21:46Z, before that change). The restart didn't flow through confirmation 5445cd2d (still pending). Let me establish provenance of the Oct 4 change and the Oct 1 restart,
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `0c5355df-3432-4651-b25d-94a5b4c4e052` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Resume implementation from the acceptance criteria, latest comments, and this summary.

## Comments (10)

**founder** · 2026-10-01T13:30:58.094836+00:00

PO — limite imediato de AID-3630: suspenda qualquer alteração no Paperclip instalado, scheduler/recovery em execução, bundle vendor, configuração ou reinício/deploy. A delegação de investigação não autoriza aplicar essa mudança no runtime. Preserve o trabalho já feito e informe exatamente se houve alguma escrita ou reinício, com arquivos, diff e horários; não faça reversão às cegas. Continue somente com diagnóstico e proposta somente leitura, ou artefato draft isolado para revisão, sem afetar o serviço. Nenhuma alteração de credenciais, permissões, proteções, políticas de aprovação ou supressão de evidências. A hipótese monitor futuro ⇒ recovery redundante precisa de revisão independente e critérios negativos para não perder continuações produtivas; 48→24 é uma hipótese de resultado, não uma autorização nem garantia. Não há Reviewer/Approver configurado nesta tarefa: não se autoaprove nem publique/aplique. Retorne um checkpoint com escopo, fontes e riscos para decisão do PO antes de qualquer implementação operacional.

[@Platform & CI Engineer](agent://1e9be0fa-c320-4309-9704-c755c53da7fd?i=git-branch)

**Platform & CI Engineer** · 2026-10-01T13:32:14.197908+00:00

**AID-3630 — change already built + validated; fresh 24h probe re-confirms 24/24 suppression; now blocked only on the founder-ordered apply+restart window (pending confirmation on AID-3474).**

## What this heartbeat did

The requested change exists, staged and staging-validated, as board-ops kit `postclose-monitor-continuation-guard` (built under **AID-3474 item 1**, same lever):

- Kit: `/paperclip/opt/board-ops/postclose-monitor-continuation-guard/` (`apply.sh`, `rollback.sh`, `RUNBOOK.md`, auditable `service.js.patched` + `service.js.reference-2026.626.0`).
- Target re-verified today: vendored `@paperclipai/server@2026.626.0` `services/recovery/service.js` is still byte-identical to the vanilla reference (md5 `c198d15ea7146238d4013420c8554061`) — kit applies cleanly; patched file re-passed `node --check`.

## Root cause (verified first-hand, matches AID-3629's receipt)

`reconcileStrandedAssignedIssues()` snapshots all candidates once per pass. A pass that selects the row inside a monitor tick sees `monitor_next_check_at` stale/past (the trigger nulls it; the tick run re-arms +1h just before closing). The armed-monitor guard at service.js:2167 reads the stale snapshot → falls through → enqueues `issue.productive_terminal_continuation_recovery` ~25–85s after the tick closes. Live trace for the 13:05Z cycle: re-arm activity `issue.monitor_scheduled` 13:06:20.584Z → tick finished 13:06:24.766Z → wake created 13:06:49.618Z (retryOf `f0681539`).

## Patch semantics = exactly what this issue requests

Before any recovery enqueue (incl. `issue.productive_terminal_continuation_recovery`): if the snapshot shows no armed monitor, re-read `monitor_next_check_at` from the live row by PK; if armed and future → skip (any recoveryPolicy). New counter `monitorArmedFreshRead` in the periodic reconciler log proves the fresh guard decided. Safety preserved: stale/due (<= now) nextCheckAt still falls through — `needs_followup` chains and genuine stall recovery unchanged; sweep cadence, single-flight lock, receipts, AID-3321 re-arm rules untouched (predicate is read-only per pass).

## Fresh evidence (2026-10-01 ~14:20Z, live DB, probe now durable at `probe-suppression.mjs` in the kit)

- **AID-3039 last 24h: 24 ticks / 48 comments / 24 recovery wakes — 24/24 wakes were preceded by a live re-arm → all would have been suppressed; 0 needed the fall-through.** Expected post-adoption: 24 runs + 24 comments/day (acceptance criterion).
- Blast radius: 8 armed monitor-anchored candidates now (AID-2639, AID-2889, AID-2931, AID-3039, AID-3149, AID-3307, AID-3317, AID-909) — for all of these the armed-monitor skip was already the vanilla guard's intent; the patch only makes it race-free.
- Negative control observed in the wild: AID-3149 had 140 wakes/24h of which only 73 preceded by re-arm — those 67 keep their recovery wake under the patch (fall-through intact by design; that channel's volume is a separate matter, not this kit).

## Why not applied yet (hard gate)

Hard rule **AID-1521**: zero apply before the explicit founder order. The decision is already teed up: **pending `request_confirmation` `5445cd2d-4973-4307-8111-39e67c9beff1` on AID-3474** (`confirmation:AID-3474:apply-restart-window:v1`, continuationPolicy `wake_assignee`) covering the combined file-only apply (this kit + AID-3261 snooze kit) and ONE ~1–2 min container restart.

## Unblock path (owner: founder/CEO)

1. Accept the pending confirmation on AID-3474 → I am woken (wake_assignee).
2. `bash /paperclip/opt/board-ops/postclose-monitor-continuation-guard/apply.sh` (+ sibling AID-3261 kit) → container restart by host.
3. Verify: 2 consecutive hourly AID-3039 cycles with exactly 1 run each and zero `productive_terminal_continuation_recovery` wakes; reconciler log shows `monitorArmedFreshRead > 0`; then `node probe-suppression.mjs AID-3039` for the full-day <=24 runs / <=24 comments measurement → closes AID-3629 per its body.

Disposition: **blocked** — unblock owner: founder/CEO; unblock action: accept pending confirmation `5445cd2d…` on AID-3474 (apply+restart window). Rollback at any time: `rollback.sh` + restart.

**Platform & CI Engineer** · 2026-10-01T13:41:03.910332+00:00

**PO — ordem das 13:30:58Z recebida e cumprida. Suspenso imediatamente.** Checkpoint entregue em `/paperclip/opt/board-ops/checkpoint-AID-3630-PO/CHECKPOINT-2026-10-01.md` (escopo, auditoria, fontes, critérios negativos, riscos, opções de decisão).

## 1. Houve escrita ou restart por parte do AID-3630? Resposta exata: NÃO

O issue foi criado em **2026-10-01 13:23:04.966Z** e teve um único run (`0109676a`, 13:23–13:33:28Z).

- **Nenhum restart**: processo do board (pid 19) contínuo desde **2026-09-26 00:19:33Z** (25/set 20:19:33 EDT) — anterior à existência deste issue.
- **Nenhuma escrita no Paperclip instalado** (vendor/config/entrypoint): toda modificação de disco data de **26–27/set** (pré-existente, de outros issues, com autorizações próprias — inventário completo com mtimes/md5s no checkpoint §2). As únicas escritas do run foram no workspace do agente (`/paperclip/tmp_3630_*.json`) e na API do board (PATCH status→blocked + blockedBy, comentário `f6c627fa`).
- **Nada a reverter, nenhum rollback às cegas**: o patch objeto deste issue (`postclose-monitor-continuation-guard`) **não está aplicado** — alvo sem a marca do patch, md5 diverge do patched. Nenhuma alteração de credenciais, permissões, proteções, políticas de aprovação ou evidências.

## 2. Correção de nuance do meu comentário anterior (`f6c627fa`, 13:32:14Z)

Cruzou com a ordem do PO sem acuso de recebimento. Corrijo: (a) "service.js byte-idêntico ao vanilla" — o `reference` do kit foi capturado em 30/set e **já contém** o patch pré-existente stranded-monitor-guard (27/set, kit AID-3059, decisão CEO AID-3057; **inativo** — sem restart desde 25/set). Correto: o alvo **não contém o patch deste issue**; (b) o framing "unblock = aceitar confirmação `5445cd2d` → apply" está **superseded** pela ordem do PO.

## 3. Hipótese + critérios negativos (para revisão independente)

Checkpoint §3 traz o mecanismo com fontes (file:line, tick/run IDs, sondagens read-only) e §4 os **critérios negativos** pedidos — cenários em que "monitor futuro ⇒ recovery redundante" falha: monitor armado porém morto; terminal exata sem re-arme (fall-through mantido; controle negativo real: AID-3149, 67/140 wakes permanecem); nextCheckAt stale/due; superfície de continuação maior que o prompt do monitor (latência +30–90s → até +1h); erro na leitura fresca (sem try/catch por issue — semântica herdada do loop). **48→24 é hipótese de resultado**; critério de aceite pós-adoção definido, mas só mensurável após decisão do PO.

## 4. Decisão pedida (unblock owner: PO)

- **(a)** Comissionar revisão independente (sugestão: agente distinto de mim e do Storage Engineer, ex.: owner da review AID-3628) — preparo o pacote somente leitura;
- **(b)** Após revisar o checkpoint, autorizar apply na janela (instrumento `5445cd2d` no AID-3474 **com referência explícita a este checkpoint**, ou ordem direta — aceitação sem referência NÃO será tratada como autorização; eu reconfirmarei antes de qualquer ação);
- **(c)** Arquivar a alavanca.

Até a decisão: **congelado** (sem apply/restart/publish/mudança de política). Nota de risco para (b): um restart ativaria também os patches staged de 26–27/set de outros issues (AID-1290-W4, stranded-monitor-guard, entrypoint school-beta) — decisão do PO/founder, documentada no checkpoint §5.

**Disposition: `blocked` — unblock owner: PO; unblock action: decisão (a)/(b)/(c) sobre o checkpoint.**

**founder** · 2026-10-07T17:08:52.703727+00:00

## Retomada operacional autorizada pelo owner

Ordem nesta sessão: "continue e unblock all issues", após "resolver as filas ... mergear [os válidos] ... [os inválidos] fechar". Reabrir a fila para trabalho legítimo: blocked → todo, assignee atual preservado. Não é conclusão, aceite técnico, resolução fictícia de dependência, countersign ou autorização genérica para editar testes protegidos.

### Próxima ação dentro da autoridade
Owner autoriza prosseguir SOMENTE na preparação/revisão independente do checkpoint CHECKPOINT-2026-10-01.md, opção (a) documentada. Sem apply/restart/publish ou alteração vendor/config/entrypoint, credenciais/roles/políticas; patches staged de 26–27/set permanecem risco registrado, não ativados por esta ordem. Preservar a suspensão de execução até decisão específica após revisão.

### Invariantes
Planos e autorizações específicas existentes continuam mandatórios; producer ≠ verifier ≠ merger; revisão independente e head exato; testes/CI/proveniência/VOID/HOLD/contenções preservados; sem bypass, novos relays, alteração de roles/proteções ou loops sem delta. Se faltar decisão/acesso material, expor o requisito verificável na própria lane e encaminhar ao owner apropriado — não trocar o requisito por mudança de status. Não disparar run/assignment/CS duplicados. A transição usa o scheduler nativo, não launches paralelos por fora.

Execução operacional pelo board autenticado: omp session=01a1169f-b41c-77c4-980b-80f0a02f4118. Comentário de owner/retomada, não registro do produtor nem heartbeat Paperclip.

**Platform & CI Engineer** · 2026-10-07T17:18:23.070652+00:00

**Owner — ordem das 17:08:52Z triada e executada no escopo autorizado (opção (a) apenas). Suspensão de execução preservada: nada aplicado, nada reiniciado, nada publicado por esta lane.**

## 1. O que esta lane fez agora (dentro da autoridade)

- **Pacote de revisão** produzido: `/paperclip/opt/board-ops/checkpoint-AID-3630-PO/REVIEW-PACKAGE-AID-3630.md` (heads exatos com md5s, perguntas de veredito para os 6 critérios negativos, comandos de re-verificação read-only, restrições/invariantes, formato de veredito).
- **State delta** registrado: `/paperclip/opt/board-ops/checkpoint-AID-3630-PO/STATE-DELTA-2026-10-07.md` — tudo o que mudou desde o checkpoint (abaixo).
- **Verifier independente designado via scheduler nativo**: child issue **AID-4230** (todo, assignee **QA Lead**), com escopo autocontido. Producer ≠ verifier ≠ merger preservado: eu produzi o checkpoint; o QA Lead verifica; a decisão (merger/apply) permanece do owner.

## 2. Correção importante à minha própria sugestão anterior

O checkpoint §6(a) sugeriu como revisor o "owner da review AID-3628" — verificando agora, **esse owner sou eu** (AID-3628 assignee = Platform & CI Engineer). Inválido sob producer ≠ verifier. Corrigido: **QA Lead** (agente distinto de mim e do Storage Engineer/AID-3629), com histórico de vereditos first-hand (ex.: AID-3272).

## 3. Estado do mundo mudou desde o checkpoint (verificado first-hand agora; AID-3630 nada fez entre 01/10 13:41Z e este heartbeat)

- **Board foi reiniciado em 01/10 21:46:19Z** (pid 18; pid 19 de 25/set não existe mais) — **fora** da confirmação `5445cd2d` do AID-3474, que segue **pending/nunca aceita**. Esse restart **ativou** os patches staged de 26–27/set que o checkpoint §5 registrou como risco (AID-1290-W4, stranded-monitor-guard, entrypoint school-beta). Autorização do restart não é localizável nesta lane — flagado no pacote de revisão §4 como possível lacuna de governança a apurar.
- **A alavanca evoluiu em outras lanes**: kit `monitor-trigger-grace` (AID-3783, disco desde 02/10 13:40Z) e kit `monitor-cadence-freshread-guard` (**AID-3975**, disco desde 04/10 22:22Z, md5 `3abd3bc8…`). O RUNBOOK AID-3975 declara o kit AID-3474/AID-3630 **"superseded for the sweep path"**. Nenhum dos dois está ativo no processo (boot 01/10 é anterior a ambos).
- **Experimento natural** (medição read-only agora, AID-3039 últimas 24h): 15 ticks / 36 comments / **9 recovery wakes, 9/9 precedidos de re-arme** (0 usos do fall-through). Ou seja: o snapshot guard live reduziu a duplicação (24→9 wakes/dia) mas não a eliminou; o ganho residual do fresh-read staged é ~9 wakes/dia, e a revisão da hipótese agora também decide sobre esse head staged.
- Divergências flagadas no pacote §4: RUNBOOK AID-3975 diz "Not applied" mas o disco contém o patch; `probe-freshread-replay.mjs` do kit AID-3975 está vazio (0 bytes); churn `.rolledback-20261004T184546Z` não narrado.

## 4. Disposition

**`blocked`** — blockers first-class: **AID-4230** (revisão independente QA em andamento) e **AID-3474** (in_review; confirmação `5445cd2d` pendente/congelada). Unblock owner: **owner/PO** — ação: decisão específica após o veredito do AID-4230 (antes disso: nenhuma ativação, nenhuma mudança de política). A fila "blocked→todo" do owner não foi aplicada ao deliverable desta lane: o trabalho autorizado (preparação da revisão) foi feito e delegado; a execução continua suspensa por design.

**Platform & CI Engineer** · 2026-10-07T17:19:14.665737+00:00

**Correção de head-pins (v2) para o verifier do AID-4230** (não posso comentar no child issue — fora do meu boundary de autorização; esta nota é o registro autoritativo na minha lane):

- `STATE-DELTA-2026-10-07.md` = `63e304a8f4a4d03c4d07d5284dd8c5c7` (rev. com timestamps de verificação corrigidos: ~17:10/~17:15Z reais; a rev. `8a197b11…` citada na descrição do AID-4230 está **revogada** — conteúdo substantivo inalterado, apenas horários estimados errados foram corrigidos)
- `REVIEW-PACKAGE-AID-3630.md` = `ab6593aa6b18fd1bc1bbd20a2a37313a` (tabela §1 atualizada com o pin acima)
- `CHECKPOINT-2026-10-01.md` = `2425717df28e0aaf7af39e780c0b1b1a` (inalterado)

O entry point da revisão é o REVIEW-PACKAGE (a descrição do AID-4230 aponta para ele); os pins da tabela §1 dele prevalecem sobre qualquer md5 citado em texto. Confrontar sempre com `md5sum` antes de revisar (invariante: head exato).

**Platform & CI Engineer** · 2026-10-07T17:40:20.675737+00:00



**Platform & CI Engineer** · 2026-10-07T17:40:20.782612+00:00



**Platform & CI Engineer** · 2026-10-07T17:40:20.914765+00:00



**Platform & CI Engineer** · 2026-10-07T17:41:43.173628+00:00

**AID-3630 — Platform & CI disposition: independent review (option a) COMPLETE; AID-4230 verdict consumed. Disposition: done.** No apply/restart/publish by this lane (owner boundary 17:08:52Z respected).

Pins verified first-hand: CHECKPOINT `2425717d…`, REVIEW-PACKAGE `ab6593aa…`, STATE-DELTA v2 `63e304a8…` = the 17:19:14Z pins.

AID-4230 QA verdict (done 17:32:55Z; dossier `/paperclip/aid4230-evidence/VERDICT-AID-4230.md`): hypothesis VALID armed-future; snapshot guard from the 10-01T21:46Z restart already killed the post-close stream (AID-3039 extinct since 10-04T19:05Z; last 24h = 24 runs, 9 wake-cycles all productive race wins). REFUTED for current regime: the staged AID-3975 fresh-read head (disk 10-04T22:22Z, not running) suppresses 0/32 + 0/37 post-restart wakes — its value is AID-2889 flap suppression 14/14 + AID-3783 grace, not further AID-3039 volume. Comments criterion (36/day > 24) re-measured in AID-3990 SS5.

Handover: activation window = **AID-3990** (founder accepted `confirmation:AID-3990:restart-activate-guards` 10-05T09:53:46Z; monitor armed 21:30Z); md5-spoof anomaly = child **AID-4234** (sha256 pins gate the restart); parent **AID-3629** closing done this heartbeat; AID-3783 flip-race remains open.

Provenance: agent=Platform & CI (1e9be0fa) issue=AID-3630 run=938e442d-3ff0-4af8-8dd9-48e4c9fd0e8c

---

