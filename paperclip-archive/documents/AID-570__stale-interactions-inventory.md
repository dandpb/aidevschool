<!-- issue: AID-570 | key: stale-interactions-inventory | doc_id: fcb6cde1-98a0-4c0d-a149-73128f8163bb | updated: 2026-09-04 23:06:06.64+00 -->

# Inventário definitivo — 130 interações pending (4 vivas / 126 stale)

(AID-570)

# Inventário definitivo — interações `pending` no board (varredura completa 2026-09-04 ~23:1xZ, CEO/AID-827)

Varredura first-hand de TODAS as 826 issues do board (não só recentes). Total: **130 interações `pending`** em 122 issues — **4 vivas** (decisão real do founder) e **126 stale** (97 em issues `done`, 29 em `cancelled`).

**Rota de resolução é board-only para agentes (403 first-hand, verificado AID-827/AID-570). Dono da limpeza: founder, em uma passada de UI.**

### VIVAS — responder/decidir (não resolver como stale) (4)
Estas gates continuam com valor de bloqueio real:

| Issue | Status | Interaction | Kind | Criado | Assunto |
|---|---|---|---|---|---|
| AID-570 | in_review | `9d4b638a` | ask_user_questions | 2026-09-03 | AID-570 — 8 cards stale superseded: limpeza + prevenção |
| AID-641 | in_progress | `cf8b749c` | ask_user_questions | 2026-09-02 | AID-641 — Recrutamento n=5–8 devs para o teste moderado O1 ( |
| AID-768 | blocked | `42e6116b` | ask_user_questions | 2026-09-04 | Recrutamento O1 — indicações e padrões (n=5–8 devs) |
| AID-814 | in_review | `97f3b5d6` | request_confirmation | 2026-09-04 | AID-814: rotear relatorio de defeito upstream aos mantenedor |

### STALE em issues `done` — resolver como superseded/executado (97)
Resultado autorizado já ocorreu e está documentado em receipts (padrão AID-570). Aceitar quando o card pedia uma ação que de fato aconteceu (merge/promoção/countersign); rejeitar quando substituído por card mais novo (ex.: `e59b8daf` AID-792 rev 1 → decidir pelo `8a2bd372` rev 2).

| Issue | Status | Interaction | Kind | Criado | Assunto |
|---|---|---|---|---|---|
| AID-1 | done | `b10f18cb` | ask_user_questions | 2026-08-04 | (sem título) |
| AID-124 | done | `55958fd4` | request_confirmation | 2026-08-24 | (sem título) |
| AID-126 | done | `edfcb08e` | request_confirmation | 2026-08-24 | (sem título) |
| AID-142 | done | `35fd67c0` | request_confirmation | 2026-08-24 | (sem título) |
| AID-145 | done | `b792904e` | request_confirmation | 2026-08-24 | (sem título) |
| AID-150 | done | `6abd8842` | request_confirmation | 2026-08-24 | (sem título) |
| AID-180 | done | `141d9ac9` | request_confirmation | 2026-08-30 | Desfecho da coorte — aceite da revisão QA independente (AID- |
| AID-187 | done | `9e30c10e` | request_confirmation | 2026-08-26 | (sem título) |
| AID-191 | done | `933fa445` | request_confirmation | 2026-08-26 | Handoff para QA independente |
| AID-207 | done | `67bae9e3` | request_confirmation | 2026-08-26 | (sem título) |
| AID-21 | done | `cbc683b0` | request_confirmation | 2026-08-22 | (sem título) |
| AID-225 | done | `4d77912a` | request_confirmation | 2026-08-26 | Revisão independente do vínculo attempt_id |
| AID-227 | done | `283c86fd` | request_confirmation | 2026-08-27 | (sem título) |
| AID-24 | done | `e5539494` | ask_user_questions | 2026-08-05 | Dados necessários para publicar o System Designer |
| AID-242 | done | `5191889b` | request_confirmation | 2026-08-27 | (sem título) |
| AID-263 | done | `8c3391f0` | request_confirmation | 2026-08-28 | (sem título) |
| AID-274 | done | `fea5f40c` | request_confirmation | 2026-08-28 | Aceitar padronização attempt_id e caminho de merge (AID-274) |
| AID-279 | done | `0d4ae741` | request_confirmation | 2026-08-28 | Aprovar merge do PR #178 em main (protegido) — fix drift AID |
| AID-286 | done | `9d0708a0` | ask_user_questions | 2026-08-28 | AID-286: cadência de publicação das missões literacy l04+ |
| AID-289 | done | `c673f52a` | ask_user_questions | 2026-08-29 | AID-289/B2: como satisfazer a review exigida do PR #178 (aut |
| AID-290 | done | `3e95cd89` | request_confirmation | 2026-08-29 | Aceitar o re-pin promovido d2bf36c2 (gating WebGL reduced-mo |
| AID-293 | done | `3735f753` | ask_user_questions | 2026-08-29 | CEO: 4 decisões humanas destravam o caminho crítico |
| AID-298 | done | `485ccf99` | request_confirmation | 2026-08-29 | Aprovar merge do PR #179 (fix AID-298, checks verdes) |
| AID-304 | done | `14d1a37f` | ask_user_questions | 2026-08-29 | Decisão F1 (pré-GO coorte): verificador Dev indisponível no |
| AID-316 | done | `e7390d8b` | request_confirmation | 2026-08-29 | AID-316: aprovar merge do PR #178 @ ae224ada (spec Dev remot |
| AID-317 | done | `944ca204` | suggest_tasks | 2026-08-29 | Aceitar a tarefa QA: re-execução do smoke remoto no PR #178 |
| AID-358 | done | `70c4ca6e` | request_confirmation | 2026-08-30 | AID-358 (C4): merge board-only do PR #191 (rebasado, CI 34/3 |
| AID-367 | done | `a7ff1971` | ask_user_questions | 2026-08-30 | (sem título) |
| AID-383 | done | `2bea5216` | request_confirmation | 2026-08-30 | AID-383: resolver as 3 pendências canônicas do fundador (des |
| AID-386 | done | `b9490122` | ask_user_questions | 2026-08-30 | PR #182: como executar o merge já aprovado? (espelho de a7ff |
| AID-393 | done | `41b20b53` | request_confirmation | 2026-08-30 | Forçar liberação do run zumbi d4a4c956 para concluir flips A |
| AID-397 | done | `44f75747` | request_confirmation | 2026-08-30 | (sem título) |
| AID-397 | done | `5746eb05` | request_confirmation | 2026-08-30 | Review & merge PR #188 (AID-394 SDLC loop artifacts) |
| AID-417 | done | `8dd3de2f` | request_confirmation | 2026-08-30 | Autorizar merge board-only do PR #193 (readiness v14, docs-o |
| AID-422 | done | `0a132e78` | request_confirmation | 2026-08-30 | Aprovação board — Emenda T0 (ids l18–l20, mod-06) + decreto |
| AID-423 | done | `bd55d0cb` | request_confirmation | 2026-08-30 | Aprovação board — Emenda T0 (ids l18–l20, mod-06) + decreto |
| AID-424 | done | `9dfebec5` | request_confirmation | 2026-08-30 | Autorizar ciclo de evidência readiness v15 para destravar PR |
| AID-426 | done | `501ab9c1` | request_confirmation | 2026-08-30 | Aprovação board — Emenda T0 (ids l18–l20, mod-06) + decreto |
| AID-433 | done | `7e32657f` | request_confirmation | 2026-08-30 | (sem título) |
| AID-448 | done | `12d027d8` | request_confirmation | 2026-08-31 | (sem título) |
| AID-448 | done | `7b3e3f77` | request_confirmation | 2026-08-31 | (sem título) |
| AID-449 | done | `6a0fa64b` | request_confirmation | 2026-08-31 | (sem título) |
| AID-450 | done | `f03612d6` | suggest_tasks | 2026-08-31 | Próxima onda pós-C1–C3 (catálogo 20 ready / 0 planned; próxi |
| AID-46 | done | `2dc2522c` | request_confirmation | 2026-08-22 | (sem título) |
| AID-46 | done | `3df47f24` | request_confirmation | 2026-08-23 | (sem título) |
| AID-473 | done | `6c8c2543` | request_confirmation | 2026-09-01 | AID-473: fundador — pousar PR #218 (OP-B F2) no GitHub UI (a |
| AID-475 | done | `5dbe597b` | request_confirmation | 2026-08-31 | AID-475: autorizar landing do PR #214 (OP-B fundacional F1 c |
| AID-503 | done | `87d888ad` | request_confirmation | 2026-09-01 | AID-503: autorizar o merge do PR #189 (SDLC AID-394/AID-399) |
| AID-53 | done | `bbf1ad71` | request_confirmation | 2026-08-22 | (sem título) |
| AID-531 | done | `d98909b7` | request_confirmation | 2026-09-01 | Desbloquear merge do PR #221 (emenda T0, CI 4/4 verde) — pro |
| AID-536 | done | `59be964e` | ask_user_questions | 2026-09-01 | AID-536: PR #221 (emenda T0 l21–l23) 35/35 checks verdes, ma |
| AID-537 | done | `9d74f9c1` | request_confirmation | 2026-09-01 | AID-537: merge do PR #223 (guardrails SDLC em CI) após vered |
| AID-539 | done | `b4fb2cf6` | request_confirmation | 2026-09-02 | Merge PR #256 — fix do guard test_enforce_rejects_report_nar |
| AID-540 | done | `23e5ea08` | ask_user_questions | 2026-09-01 | Destravar merge do PR #221 — onda l21–l23 parada no gate de |
| AID-546 | done | `a3d2c2f6` | request_confirmation | 2026-09-01 | AID-546: autorizar fila de merge #223 → #221 → #222 (janela |
| AID-547 | done | `f53a18c9` | request_confirmation | 2026-09-01 | AID-547: autorizar fila de merge #223 → #221 → #222 (toggle |
| AID-549 | done | `4491a8cb` | request_confirmation | 2026-09-01 | AID-549: autorizar merge da fila restante #221 → #222 (gate |
| AID-551 | done | `90882dcb` | request_confirmation | 2026-09-01 | Ratificação: merge do PR #221 (emenda T0 l21–l23) executado |
| AID-554 | done | `6eb005b4` | request_confirmation | 2026-09-02 | Política guardrail SDLC (AID-554): escolher A (allowlist) vs |
| AID-555 | done | `1a878598` | request_confirmation | 2026-09-01 | AID-555: merge do PR #230 (readiness v18 re-grant os-* @aa4d |
| AID-557 | done | `f1ef2eab` | request_confirmation | 2026-09-01 | AID-557: autorizar disposição do backlog de PRs — merge dos |
| AID-558 | done | `d048197e` | request_confirmation | 2026-09-01 | AID-558 (rev 2, pós-resposta CD): escolha da próxima onda — |
| AID-566 | done | `78fdb79c` | request_confirmation | 2026-09-02 | AID-566: merge do PR #231 (re-grant v19 os-* @ b0c67648) + d |
| AID-577 | done | `d0ec8c57` | request_confirmation | 2026-09-02 | AID-577 · Gate T0 (regra 7): emenda board-gated da onda O2 — |
| AID-581 | done | `3df4277f` | request_confirmation | 2026-09-02 | AID-581 · Desvios divulgados da emenda T0 O2 (PR #235, CI ve |
| AID-591 | done | `7fc394b8` | request_confirmation | 2026-09-02 | AID-581 · Desvios divulgados da emenda T0 O2 (PR #235, CI ve |
| AID-591 | done | `dc18cdb9` | request_confirmation | 2026-09-02 | AID-591 · T3/l26 fecha a ONDA O2 — PR #238 CI 36/36 verde — |
| AID-594 | done | `02c4879d` | request_confirmation | 2026-09-02 | AID-594 · INFRA: resetar sessão OpenCode do System Designer |
| AID-599 | done | `e614364b` | request_confirmation | 2026-09-02 | AID-599: CEO merge do PR #238 (T3/l26, onda O2) — destrava o |
| AID-601 | done | `bfc4fd8f` | request_confirmation | 2026-09-02 | AID-601 · Gate A promoção única O2 executada (produção 88/88 |
| AID-630 | done | `664beb9f` | request_confirmation | 2026-09-02 | AID-630 · Promoção única O1 executada (produção 6a9816a5, pr |
| AID-631 | done | `f418119a` | request_confirmation | 2026-09-02 | AID-631 · Gate B O1 completo: GO da onda + re-grant os-* v22 |
| AID-637 | done | `02dc9487` | request_confirmation | 2026-09-02 | Aterrisar receipt final na AID-610 e fechar done — ação boar |
| AID-638 | done | `d3eda6e8` | request_confirmation | 2026-09-02 | AID-638 · Gate B O1 GO + re-grant os-* v22 — merge CEO do PR |
| AID-66 | done | `12918cbb` | request_confirmation | 2026-08-22 | (sem título) |
| AID-667 | done | `4f0dc678` | request_confirmation | 2026-09-02 | AID-667: merge CEO do PR #253 — registro do re-grant v23 os- |
| AID-669 | done | `39741f6a` | ask_user_questions | 2026-09-02 | AID-669 · Board: (1) ativar transporte do funil OP-B em prod |
| AID-675 | done | `4a6defaf` | request_confirmation | 2026-09-02 | Confirmação CEO: T1/F2b concluído (PR #251, CI 36/36) — acei |
| AID-676 | done | `850cf814` | request_confirmation | 2026-09-02 | AID-676 · T2/F3 sink literacyDojo composto atrás de VITE_ANA |
| AID-695 | done | `27358c47` | request_confirmation | 2026-09-03 | MERGE CARD v2 AID-695 — PR #257: QA GO recebido (AID-707) + |
| AID-695 | done | `de8ba32c` | request_confirmation | 2026-09-03 | Card de merge AID-695 — PR #257 (teste pickRandomShopId, CI |
| AID-701 | done | `62bde8b8` | request_confirmation | 2026-09-03 | AID-701: autorizar merge single-writer do PR #258 (teste per |
| AID-710 | done | `c98be92e` | request_confirmation | 2026-09-03 | AID-710: board cancela cards stale 62bde8b8 (AID-701/pr258) |
| AID-718 | done | `4962d3ed` | ask_user_questions | 2026-09-03 | Desbloqueio AID-718 — 3 decisões do founder |
| AID-722 | done | `4b50ae71` | request_confirmation | 2026-09-03 | Founder merge: PR #260 (fix ci-only AID-722) — CI verde no h |
| AID-723 | done | `d6a28d7d` | request_confirmation | 2026-09-03 | MERGE PR #260 pelo founder (single-writer #240/AID-608) — fi |
| AID-727 | done | `ad2475cf` | request_confirmation | 2026-09-03 | AID-727 · Triage SM: defect report fingerprint watchdog — AC |
| AID-731 | done | `28e1640f` | ask_user_questions | 2026-09-03 | AID-731 · Desbloqueio: 3 decisões que só você pode tomar (me |
| AID-742 | done | `0d7863ee` | request_confirmation | 2026-09-03 | Countersign AID-742: E2E literacyDojo port-independent (PR # |
| AID-754 | done | `6c9223ae` | request_confirmation | 2026-09-04 | Countersign AID-754: guarda automatizada rota hosted ?host=o |
| AID-757 | done | `68c132db` | request_confirmation | 2026-09-04 | AID-757 · PR #263 aguarda merge single-writer (CEO) — decisõ |
| AID-771 | done | `b3bf27e5` | request_confirmation | 2026-09-04 | AID-771 · Retrofit F1 docs-only (PR #266, CI 36/36 verde) — |
| AID-792 | done | `8a2bd372` | request_confirmation | 2026-09-04 | AID-792 (rev 2, pós-resposta CD): próxima onda — C consolida |
| AID-792 | done | `e59b8daf` | request_confirmation | 2026-09-04 | AID-792: próxima onda — C consolidação 2 tranches (recomenda |
| AID-80 | done | `e8909dd1` | request_confirmation | 2026-08-23 | (sem título) |
| AID-808 | done | `bd809b99` | request_confirmation | 2026-09-04 | Countersign QA + autorização de merge — ONDA C1 AID-808 (PR |
| AID-85 | done | `52d59ce3` | request_confirmation | 2026-08-23 | (sem título) |

### STALE em issues `cancelled` — rejeitar como moot (29)
Issue hospedeira cancelada; card sem efeito.

| Issue | Status | Interaction | Kind | Criado | Assunto |
|---|---|---|---|---|---|
| AID-106 | cancelled | `a14e7fa6` | request_confirmation | 2026-08-24 | (sem título) |
| AID-115 | cancelled | `78cc4d5e` | request_confirmation | 2026-08-24 | (sem título) |
| AID-117 | cancelled | `8a3a6e67` | request_confirmation | 2026-08-24 | Autorizar merge protegido da PR #161 |
| AID-119 | cancelled | `71bf4627` | request_confirmation | 2026-08-24 | (sem título) |
| AID-131 | cancelled | `11be393b` | request_confirmation | 2026-08-24 | (sem título) |
| AID-135 | cancelled | `1efd1bd9` | request_confirmation | 2026-08-24 | (sem título) |
| AID-140 | cancelled | `1a56c80a` | request_confirmation | 2026-08-24 | Autorizar publicação de novo candidato do piloto |
| AID-140 | cancelled | `5591d831` | request_confirmation | 2026-08-25 | Decidir retomada do piloto nos sucessores aprovados |
| AID-140 | cancelled | `ace557f6` | request_confirmation | 2026-08-24 | Autorizar publicação de novo candidato do piloto |
| AID-157 | cancelled | `8072f797` | request_confirmation | 2026-08-25 | Confirmar próximos gates |
| AID-165 | cancelled | `04bea24a` | request_confirmation | 2026-08-25 | (sem título) |
| AID-166 | cancelled | `fd95f007` | request_confirmation | 2026-08-25 | (sem título) |
| AID-181 | cancelled | `af60fdc7` | request_confirmation | 2026-08-25 | (sem título) |
| AID-182 | cancelled | `7d5f305e` | request_confirmation | 2026-08-25 | (sem título) |
| AID-197 | cancelled | `37f817e9` | request_confirmation | 2026-08-26 | (sem título) |
| AID-318 | cancelled | `78a1a57e` | request_confirmation | 2026-08-29 | Decisão única do fundador — liberar o piloto AiDevSchool |
| AID-354 | cancelled | `7efcfde2` | ask_user_questions | 2026-08-29 | Desbloqueio do pipeline: 2 decisões do fundador |
| AID-415 | cancelled | `3c26efb9` | request_confirmation | 2026-08-30 | Autorizar merge do PR #194 (ponte staged 4 jogos) + promoção |
| AID-416 | cancelled | `738d5a2c` | request_confirmation | 2026-08-30 | Aprovar merge do PR #195 — fix da corrida de fase em complet |
| AID-461 | cancelled | `f174a0df` | ask_user_questions | 2026-08-31 | AID-461 probe2: qual é a verificação pretendida? |
| AID-572 | cancelled | `4f131405` | ask_user_questions | 2026-09-02 | Higiene do board (Auditoria #5, AID-570): 2 ações board-only |
| AID-69 | cancelled | `d21974c6` | request_confirmation | 2026-08-22 | Autorizar publicação protegida dos quatro gates |
| AID-73 | cancelled | `2e789b60` | request_confirmation | 2026-08-23 | (sem título) |
| AID-732 | cancelled | `9aa50a05` | ask_user_questions | 2026-09-03 | AID-732 · Desbloqueio: 3 decisões do founder (piloto P6 · I2 |
| AID-737 | cancelled | `8419f040` | ask_user_questions | 2026-09-03 | AID-737 · Desbloqueio: pre-flight VERDE (veredito acima) — 3 |
| AID-89 | cancelled | `90f4978f` | request_confirmation | 2026-08-23 | Aprovar PR #161 para liberar o piloto |
| AID-91 | cancelled | `d0c87885` | request_confirmation | 2026-08-23 | (sem título) |
| AID-92 | cancelled | `29109263` | ask_user_questions | 2026-08-23 | Desbloquear PR #161 |
| AID-94 | cancelled | `4173473b` | request_confirmation | 2026-08-23 | (sem título) |

## Prevenção (uma linha, critério AID-570)
Plataforma: auto-resolve de interações `pending` quando a issue hospedeira vira `done`/`cancelled` (incluir no relay upstream do card `97f3b5d6`/AID-814, junto com AID-823). Agentes: checklist de supersession nas triagens CEO — nunca criar gate novo sem cancelar/marcar o substituído (regra já registrada pelo SD na AID-792).