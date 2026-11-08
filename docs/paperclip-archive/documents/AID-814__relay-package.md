<!-- issue: AID-814 | key: relay-package | doc_id: 28b9582f-285e-4e4f-b09d-d993b53e55d1 | updated: 2026-09-06 11:05:10.494+00 -->

# Upstream relay package — 3 defects (W0 watchdog loop, W1 monitor strip, W4 assignee drop) + auto-cancel-on-done FR

(AID-814)

# Upstream relay package — Paperclip platform defects + 1 feature request

**Status:** READY TO FORWARD (CEO, 2026-09-06 ~11:1xZ)
**Autorização do founder:** card `97f3b5d6` (AID-814) **aceito em 2026-09-06T10:46:13Z** — decisão 1 do gate record AID-727: rotear upstream aos mantenedores do Paperclip (alternativa hot-patch local NÃO escolhida).
**Ação do founder:** encaminhar este documento (copiar/colar) aos mantenedores do Paperclip pelo canal de sua preferência. Nenhum anexo externo é necessário — toda evidência está aqui ou linkada por issue ID.

---

## Defeito 1 (W0) — task-watchdog stop-fingerprint self-retrigger loop [regressão do fix AID-727]

**Componente:** `task watchdog` (dispatch/mutation machinery)
**Severidade:** high — loops de runs no-op ilimitadas com período decrescente; queima de budget e risco de mascarar parada genuína
**Tracking:** AID-814 (esta issue)

**Sintoma:** o watchdog re-dispara com "stopped fingerprint" mesmo quando a árvore vigiada está bit-idêntica. Timeline 2026-09-04 (watchdog AID-783 vigiando AID-780):

| Trigger | Horário | Fingerprint (prefixo) | Contexto |
|---|---|---|---|
| T1 | 05:38:06 | 6baecc07 | parada genuína (AID-780 `blocked` 05:34:34) |
| T2 | 15:09:40 | 748b4ed4 | round-1 fechou 05:47; árvore idêntica |
| T3 | 18:04:50 | ff669334 | árvore idêntica desde 05:34:34 |
| T4 | 18:26:41 | 9cd162a1 | 21m após round-3 fechar |
| T5 | 18:30:11 | c4a2466d | 2m57s após round-4 fechar |

Períodos: 9.5h → 2.9h → 21m → 3m (**acelerando**). Firing acoplado: dois watchdogs (255989ed, 6e4029b6) dispararam no mesmo segundo (18:30:11.375/.573).

**Mecanismo provável:** o dispatch do watchdog muta a própria issue watchdog (comments automáticos "Task watchdog resumed…" a cada trigger: 18:04:50.235 / 18:26:41.494 / 18:30:11.570); esses efeitos de bookkeeping entram como delta na rodada seguinte → o fingerprint "muda" sem mudança real da árvore vigiada. O anchor watchdog 255989ed re-triggerou 6→8 com zero verdict comments desde 05:41 e AID-670 quieta desde 06:10.

**Fixes sugeridos (idem AID-727):** (a) carimbar `lastReviewedFingerprint` APÓS todos os efeitos de pós-rodada e excluir dos inputs os acks/dispatch comments atribuíveis à própria rodada watchdog; (b) autorizar o watchdog agent de record a gravar snooze/continue nos seus runs.

**Contenção executada (instância):** DELETE do watchdog 6e4029b6 (AID-780) + regra de não re-armar até fix upstream; cobertura do gate d+7 preservada por carriers com monitor (workaround §5 do defeito 2). Instruções para re-arme pós-fix preservadas no comentário final da AID-783.

---

## Defeito 2 (W1) — PATCH silenciosamente descarta campo `monitor` no nível raiz

**Componente:** `@paperclipai/server` rota `PATCH /api/issues/:id` + validação zod (`packages/shared` → `updateIssueSchema`)
**Severidade:** high — perda silenciosa de agendamento de wake, sem sinal de erro (200 OK)
**Tracking:** AID-823 — **relatório completo com repro first-hand, root cause exato e fix proposto no doc `defect-report` daquela issue** (steps 1–4, localizações de arquivo/linha, patch cirúrgico verificado contra o zod instalado)

**Resumo:** `updateIssueSchema` é `z.object(...).partial()` — zod **stripa unknown keys silenciosamente**; não existe propriedade `monitor` no nível raiz (só `executionPolicy.monitor`). `validate.js` faz `req.body = schema.parse(req.body)` → o handler nunca vê a chave descartada → 200 sem erro, `monitor: null`. O defeito é status-independente, mas morde mais em issues `blocked` (o caminho aninhado 4xx-es de propósito lá, então clientes buscam o shape raiz e recebem 200 no-op).

**Fix proposto (1 arquivo, route-local):** `updateIssueSchema.extend({ monitor: z.unknown().optional().refine(v => v === undefined, { message: "...use executionPolicy.monitor..." }) })` — transforma o drop silencioso em HTTP 400 com mensagem acionável. Recomenda-se aplicar o mesmo padrão a `POST /issues` e `POST /issues/:id/children` + auditoria geral de chavras desconhecidas com semântica de agendamento em rotas de mutação.

**Evidência do impacto real:** AID-815 comentário `5ed9dbc3` — monitor one-shot (wake 2026-09-08T17:20Z para gate temporal) nunca existiu apesar do 200.

---

## Defeito 3 (W4) — drop silencioso de `assigneeAgentId` em carriers (mesma classe write-sem-eco)

**Componente:** caminhos de mutação de issue (PATCH handler + mutações recovery/watchdog) — **a auditoria é o pedido**
**Severidade:** high quando manifesta — `recoveryPolicy: wake_owner` dispara sem alvo = gate perdido silenciosamente
**Tracking:** AID-871 (Annex W4 do doc `defect-report` da AID-823)

**Observação first-hand (2026-09-05 ~11:0xZ, sweep AID-851):** carriers AID-832 e AID-814 encontradas com `assigneeAgentId: null` após mutações anteriores sem erro retornado; restaurado e re-verificado por re-GET. Confirmação independente: Auditoria SDLC #8 (AID-400, §3 linha W4).

**Repro status — NÃO pinado:** probe AID-870 — create-with-assignee PRESERVA o campo; dois PATCHs seguintes rejeitados com 409 explícito `Issue run ownership conflict` (by-design, correto). O drop silencioso não reproduziu em 2 probes. **Pedido aos mantenedores:** auditar ramos que persistem a issue sem ecoar/validar o campo assignee.

**Comportamento esperado:** mutação preserva `assigneeAgentId` OU rejeita com 4xx explícito; nunca 200 que nula o campo.

---

## Feature request (prevenção) — auto-cancel-on-done de interações `pending`

**Ratificada como política da casa pelo founder** (card `9d4b638a`/AID-570, 2026-09-06T10:45:51Z): interações `pending` em issues fechadas (`done`/`cancelled`) deveriam ser supersession/resolvidas automaticamente pela plataforma.

**Contexto:** inventário completo da varredura de 826 issues (AID-527 23:0xZ): **130 interações `pending` = 4 vivas + 126 stale** (97 em `done`, 29 em `cancelled`) — roteiro one-pass e tabela completa no doc `stale-interactions-inventory` (rev `f92d9d08`) da AID-570. Hoje a limpeza exige cliques manuais no board (rota de cancel via API é board-only p/ agentes — 403 first-hand, re-confirmado 2026-09-06 11:0xZ).

**Pedido:** ao fechar uma issue, resolver (cancel/supersede) automaticamente as interações `pending` dela, com evento auditável.

---

## Mitigação interim em vigor nesta instância (informativo)

Checklist "write-echo" (decisão CEO, ORDEM AID-869): após QUALQUER `PATCH /api/issues/{id}`, a run escritora re-GET e verifica a tripla de continuidade `status` + `assigneeAgentId` + `monitorNextCheckAt`, citando os três valores no receipt. Divergência = write falho → retry/escalate. Teria pegado W1 e W4 no momento da escrita.

## Após o fix upstream (critérios de aceite para re-arme)

1. W1: repro steps 3–4 do doc `defect-report` (AID-823) retornam **400** em ambos os shapes monitor-on-blocked; PATCH normal inalterado.
2. W0: watchdog re-armado na árvore AID-780 SEM self-retrigger por ≥24h com árvore congelada (regression watch do gate record AID-727).
3. W4: auditoria do vendor concluída (ou repro pinada) com comportamento write-echo garantido para `assigneeAgentId`.
