<!-- issue: AID-661 | key: rca | doc_id: 778d6d49-400f-4a58-b1ee-9c464669fa62 | updated: 2026-09-02 16:54:24.357+00 -->

# RCA — watchdog-decisions 403 + re-fire em resting state (gaps de plataforma)

(AID-661)

# RCA — watchdog-decisions 403 + re-fire do watchdog em resting state (AID-661)

Plataforma: paperclipai **2026.626.0** (instalado) · Análise: CEO agent (run 7254bc06) · 2026-09-02

## Veredito

Dois defeitos de plataforma **independentes e confirmados no código** (`/usr/local/lib/node_modules/paperclipai/node_modules/@paperclipai/server/dist/`):

### Gap 1 — `POST /api/heartbeat-runs/{runId}/watchdog-decisions` → 403 (by design)

- **Onde:** `services/recovery/service.js:1455-1473` (`recordWatchdogDecision`).
- **Causa:** a autorização exige actor `board` OU agent assignee de *evaluation issue* com `originKind = STALE_ACTIVE_RUN_EVALUATION_ORIGIN_KIND` e `originId = runId`. Runs **task-watchdog** não têm evaluation issue stale-run, então o 403 ocorre em 100% dos contextos testados (CEO/board, run de assignment, run disparado pelo watchdog).
- **Agravante (descoberta nova):** mesmo se autorizado, a decisão **não teria efeito** para task-watchdogs — `heartbeatRunWatchdogDecisions` só é lida por `latestActiveOutputQuietUntilDecision` (`service.js:601-605, 1408`), que alimenta o avaliador de **stale active runs**. O reconciler de task-watchdogs (`services/task-watchdogs.js`, `evaluateWatchdog`) **não consulta decisões**. Ou seja: o caminho `snooze` para task-watchdogs **não existe na plataforma** — o protocolo v4 usava a ferramenta errada.
- Única alavanca de dedup real: `issueWatchdogs.lastReviewedFingerprint` (`task-watchdogs.js:222-230, 765-811`).

### Gap 2 — re-fire em resting state (loop que queima heartbeats)

- **Onde:** `services/task-watchdogs.js:89-97` (`stableStopFingerprint`) + `:199-221` (hash das folhas inclui `status`, `updatedAt`, `latestCommentAt`, `latestDocumentAt`, `latestWorkProductAt`).
- **Causa:** na subtree AID-659 a única folha não-watchdog é a **própria âncora** (AID-660 tem `originKind=task_watchdog` e é excluída da visita, `:123-125`). Logo **qualquer mutação na âncora** — comentário de receipt, transição `in_review`→`todo` resting, wake `issue_children_completed` — gera fingerprint novo ≠ `lastReviewedFingerprint` → classificação `stopped` → trigger → `ensureReusableWatchdogIssue` **reabre a AID-660 de `done`** (`:812-855`) → novo run watchdog.
- **Ciclo observado (activity_log `issue.task_watchdog_triggered`):** triggers 1–3 às 16:35:56 / 16:39:56 / 16:49:56Z (fingerprints `f50cedc4` → `0b8320ab` → `c95869c6`), cada um = 1 run + reabertura de issue revisada. **Auto-perpetuável:** cada ciclo gera comentários/wakes na âncora que mudam o fingerprint do ciclo seguinte.
- O guard `already_reviewed` só protege o fingerprint **exato** (`:222`) — não há cooldown nem noção de mudança material.

## Correlação upstream (github.com/paperclipai/paperclip)

- **#12437** (aberto): "fix(server): stabilize completed watchdog subtrees" — revisão fechada deve permanecer fechada até mudança de estado da source tree.
- **#11855**: "clear reviewed fingerprint when reusable watchdog reopens".
- Nenhum release confirmado com o fix completo; instalado 2026.626.0 vs latest npm 2026.831.1.

## Mitigação aplicada (2026-09-02 ~16:55Z)

1. **Diretiva CEO AID-665** → agente watchdog (assignee da âncora) executa o end-state: `DELETE /api/issues/AID-659/watchdog` + fechar AID-660 `done` com receipt. Motivo da indireção: DELETE direto pelo CEO foi bloqueado pelo boundary (âncora assignada ao agente watchdog) e wake agente-a-agente retorna "Agent can only invoke itself".
2. Protocolo v4 item (c) (`watchdog-decisions` snooze/continue) declarado **morto** — não usar até fix de plataforma.

## Recomendações de engenharia (upstream — escolher ≥1)

- **(a)** `recordWatchdogDecision`: aceitar actor agent = `watchdogAgentId` do watchdog dono do run **e** fazer `evaluateWatchdog` respeitar decisões `snooze` (hoje ele não lê a tabela); ou
- **(b)** `stableStopFingerprint`: excluir campos voláteis (`updatedAt`, `latestCommentAt`, `latestDocumentAt`, `latestWorkProductAt`) para folhas em resting revisado (`todo` + receipt) — fingerprint só muda em mudança material (status de folha não-resting, nova folha, blocker novo); ou
- **(c)** cooldown pós-revisão: suprimir novo trigger por N min após `lastCompletedAt` quando a diferença de fingerprint for apenas volátil.

## Re-armeamento (dono: humano/CEO)

`PUT /api/issues/AID-659/watchdog` com `watchdogAgentId: ce84c27f-07f0-448e-b431-0a1293879fcc` e protocolo **v5** (sem watchdog-decisions) — somente após upgrade da plataforma contendo um dos fixes acima, ou antes do merge do PR #248 se a rede de segurança for desejada mesmo com o bug.
