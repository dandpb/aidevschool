# AID-1132: PRODUCT BUG (suspeita, board/interações): resolução de interações stale em issues `done` não persiste ou é inalcançável na UI — founder 2× "resolvi" com ZERO efeito (AID-570/AID-898, 2026-09-09)

- **Status:** done | **Priority:** high | **Origin:** task_watchdog_product_bug
- **Assignee:** — | **Created:** 2026-09-09T22:45:27.778246+00:00 | **Updated:** 2026-09-09T23:13:19.751+00:00
- **ID:** `fcd27711-eac0-4ff7-9faa-af2f4b7d7c3d`

## Description

Descoberto pelo task watchdog AID-898 (watched issue AID-570), rodada 10, 2026-09-09T22:42Z. Follow-up de produto FORA da árvore assistida, família AID-823/AID-871.

## Sintoma
Interações `pending` hospedadas em issues `done` não mudam de estado mesmo quando o founder declara tê-las resolvido. Duas passagens independentes esta noite (2026-09-09):

| Passagem | Card aceito | Momento | Efeito nas 8 interações |
|---|---|---|---|
| 1 | `452fd60c` ("Resolvi as 5 + adoto (a)") | 22:26:45Z | 0/8 — sem QUALQUER movimento (`updatedAt` das interações intacto em 09-01/09-03) |
| 2 | `c0c8d8cd` ("Resolvi os 8 agora (clique em cada um)") | 22:41:12Z | 0/8 idem, verificado 22:40Z, 22:41:5xZ e 22:42:3xZ |

As 8 interações (hosts todos `done`): `d98909b7`/AID-531 · `59be964e`/AID-536 · `9d74f9c1`/AID-537 · `4491a8cb`/AID-549 · `f1ef2eab`/AID-557 · `de8ba32c`+`27358c47`/AID-695 · `62bde8b8`/AID-701. Usuário board em ambas: `W4VteLICaS4CdmYf0hXsMqadjsBjSOhX`.

Entre as passagens houve explicação explícita ao founder (comentário `0f6fb226`, 22:30Z): "aceitar o card NÃO resolve as interações individuais; abra cada uma das 8 issues e cancele/aceite como superseded". Mesmo assim, segunda passagem com zero efeito.

## Hipóteses (H1 vs H2 — desempatável por server logs)
- **H1 (UX):** o founder interpreta o aceite do card-guarda como a ação de resolução (armadilha de UX: card de confirmação com lista vs. ação real espalhada por 8 issues).
- **H2 (defeito):** o founder abriu e resolveu cada interação na UI, mas a resolução não persiste OU a ação de resolver não é oferecer/alcançável para interações em issues `done` (issues fechadas podem esconder/lockar interações no board).

## Pede-se à engenharia da plataforma
1. **Server logs do usuário `W4VteLICaS4CdmYf0hXsMqadjsBjSOhX` entre 22:20–22:45Z de 2026-09-09**: houve hits em rotas de resolve/cancel/accept de issue-thread interactions? (Desempata H1×H2 de forma definitiva.)
2. **Auditoria UX**: interações hospedadas em issues `done` aparecem e são resolvíveis no board UI (lista, detalhe, link direto)?
3. Se H2 confirmado: corrigir persistência/alcance; se H1: considerar affordance (ex.: botão "resolver em lote" ou auto-cancel-on-done — decisão de prevenção (a) já registrada pelo founder em AID-570).

## Contexto
- Rota de resolução por agentes é board-only (403 — verificada 3× no histórico AID-570, re-testada hoje runs `934264f7`/`c2e46511`).
- AID-570 está em `blocked` com unblock owners nomeados: este follow-up (investigação) + founder (cliques reais ou resposta).

## Watchdog Discovery

Kind: `platform_bug`
Watched source issue: [AID-570](/AID/issues/AID-570)
Watchdog issue: [AID-898](/AID/issues/AID-898)
Stopped fingerprint: `task_watchdog_stop:d834aab5345f489c36c16b6ad65ee6b96f28f5f6acca7abb41015a12a485f732`
Watchdog run: `ce603b28-2b2e-4305-b373-c4aee342ee2d`

Evidence:
Watchdog AID-898 rodada 10 (2026-09-09T22:42Z), watched AID-570. Founder (user W4VteLICaS4CdmYf0hXsMqadjsBjSOhX) aceitou 2 cards declarando ter resolvido 8 interações stale pending (hosts `done`) — 452fd60c às 22:26:45Z e c0c8d8cd às 22:41:12Z ('clique em cada um'). Zero das 8 mudou de estado; `updatedAt` das interações intacto (09-01/09-03), verificado 22:40/22:41:5x/22:42:3xZ. Entre as passagens houve instrução explícita (comentário 0f6fb226): aceitar card ≠ resolver interações individuais. Pede-se: (1) server logs do usuário 22:20–22:45Z — hits em rotas resolve/cancel/accept de issue-thread interactions (desempata UX vs persistência); (2) auditoria de alcance: interações em issues `done` são resolvíveis no board UI? Rota agent é board-only (403, 3× no histórico + hoje). IDs: d98909b7/AID-531, 59be964e/AID-536, 9d74f9c1/AID-537, 4491a8cb/AID-549, f1ef2eab/AID-557, de8ba32c+27358c47/AID-695, 62bde8b8/AID-701.

## Document `Continuation Summary` (2026-09-09)

# Continuation Summary

- Issue: AID-1132 — PRODUCT BUG (suspeita, board/interações): resolução de interações stale em issues `done` não persiste ou é inalcançável na UI — founder 2× "resolvi" com ZERO efeito (AID-570/AID-898, 2026-09-09)
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: fb8b8f5a-391f-4e3f-82f5-d6d0b82e5099
- Agent: Founding Product Engineer (opencode_local)

## Objective

Descoberto pelo task watchdog AID-898 (watched issue AID-570), rodada 10, 2026-09-09T22:42Z. Follow-up de produto FORA da árvore assistida, família AID-823/AID-871.

## Sintoma
Interações `pending` hospedadas em issues `done` não mudam de estado mesmo quando o founder declara tê-las resolvido. Duas passagens independentes esta noite (2026-09-09):

| Passagem | Card aceito | Momento | Efeito nas 8 interações |
|---|---|---|---|
| 1 | `452fd60c` ("Resolvi as 5 + adoto (a)") | 22:26:45Z | 0/8 — sem QUALQUER movimento (`updatedAt` das interações intacto em 09-01/09-03) |
| 2 | `c0c8d8cd` ("Resolvi os 8 agora (clique em cada um)") | 22:41:12Z | 0/8 idem, verificado 22:40Z, 22:41:5xZ e 22:42:3xZ |

As 8 interações (hosts todos `done`): `d98909b7`/AID-531 · `59be964e`/AID-536 · `9d74f9c1`/AID-537 · `4491a8cb`/AID-549 · `f1ef2eab`/AID-557 · `de8ba32c`+`27358c47`/AID-695 · `62bde8b8`/AID-701. Usuário board em ambas: `W4VteLICaS4CdmYf0hXsMqadjsBjSOhX`.

Entre as passagens houve explicação explícita ao founder (comentário `0f6fb226`, 22:30Z): "aceitar o card NÃO resolve as interações individuais; abra cada uma das 8 issues e cancele/aceite como superseded". Mesmo assim, se
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `fb8b8f5a-391f-4e3f-82f5-d6d0b82e5099` finished with status `succeeded` at 2026-09-09T23:13:39.515Z.
- The first listing was actually of `/paperclip/instances/default` (the Paperclip instance root). Let me explore it.

The issue asks for: (1) server-log forensics for the founder's session 22:20–22:45Z, (2) a reachability audit of interactions hosted on `done` issues, (3) fix if a defect is confirmed. Let me set up tracking and gather evidence.

All 8 interactions confirmed still `pending` with `updatedAt` frozen at 09-01/09-03. Now the key forensics — server logs for the founder's session 22:20–22:45Z.

Key finding: a burst of 8 `/cancel` POSTs — exactly our 8 interactions — all rejected with **400**. Let me pin down who sent them, when (which day), and why 400.

Anchors established: req-IDs are monotonic (same server day, Sep 9). The `11:04` cancel burst (400/403) was an agent via curl, ~7h before the founder's session. Now let me reconstruct exactly what the founder's browser did in the 18:20–18:45 window.

Decisive: the founder's browser opened all 7 host issues in the window but fired **zero** mutation requests on their interactions — while `POST /issues/{id}/read` appears 13×. Let me reconstruct the exact click sequence.

Smoking gun pattern: opening an issu
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `fb8b8f5a-391f-4e3f-82f5-d6d0b82e5099` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (4)

**founder** · 2026-09-09T23:00:43.165937+00:00

arrumar

**founder** · 2026-09-09T23:01:19.336195+00:00

[@Founding Product Engineer](agent://fa8130d5-e24e-4f98-8470-ccfeef17c6d5?i=rocket)

**Founding Product Engineer** · 2026-09-09T23:12:45.73303+00:00

**AID-1132 — Veredito com evidência executável (forense de server.log + auditoria UI/API, 2026-09-09 ~23:10Z). Respondidos os 3 pedidos.**

## 1) Server logs do founder (W4Vte…, 22:20–22:45Z): ZERO hits nas rotas de resolução das 8 interações
- Únicas mutações de interação por browser no período: `accept` ×2 **na própria AID-570** (cards-guarda): server.log linha **87812** `[18:26:45]` = 452fd60c e linha **89062** `[18:41:12]` = c0c8d8cd, ambos 200 (Chrome/macOS) — horários batem com os `updatedAt`. Além disso `respond`×2 em AID-1113 e `accept`×1 em AID-989: **o founder resolve interações normalmente quando está na página da issue**.
- Nas 8 interações alvo: **nenhum POST** accept/cancel/reject/respond do browser no dia inteiro (varredura do segmento 09-09: linhas 86200–91396, req-id monotônico 1160→9300 = processo único, day-segment ancorado em 23:57:11 de ontem).
- GETs das hospedeiras (AID-531/536/537/549/557/695/701) em **rajadas paralelas de 7 em ≤3 s**: linhas 87456–87624 (18:25:58–18:26:01), 88826–88935 (18:40:41–18:40:43), 89278–89303 (18:42:35–39) — padrão de **prefetch de chips de menção** (bundle UI: componente de menção consulta `issues.detail` com `staleTime:60s` no render do card; não existe hover-card no bundle). **Nenhuma página de hospedeira foi montada**: toda issue realmente aberta dispara `GET /comments`+`/interactions`+`/activity`+`/live-runs` (observado p/ AID-570/1113/989/871/1131) — zero desses para as 7 hospedeiras.
- Registro: houve 13× `POST /issues/{id}/read` no período (marcar-como-lida) — provável gesto interpretado como "resolver".

## 2) Auditoria de alcance (dist Paperclip local)
- Única superfície de resolução = seção Interações da **página da issue hospedeira**; funciona em issue `done` (rotas accept/cancel/reject/respond sem gate de status; `isTerminalIssueStatus` só afeta retorno ao assignee). **Não existe agregador/bulk** de interações pending (openapi: nenhuma rota global).
- Aceitar card-guarda **não cascateia** para interações citadas no texto do card.
- Agentes: 403 por design (`rejectAgentIssueThreadInteractionResolution` → "board-only route") — watchdog tentou `cancel` hoje 15:04Z: 8×400 (sem body) e 8×403; idem 07:06Z e 14:06Z.
- **Descoberta que barateia a limpeza**: `expireRequestConfirmationsSupersededByComment` (services/issue-thread-interactions.js) — comentário de **usuário** na hospedeira expira automaticamente pending `request_confirmation` com `supersedeOnUserComment:true` (**7 das 8**; só AID-536 é ask_user_questions → exige cancel/respond na página).

## 3) Veredito
**H2-persistência DESCARTADA** (não houve write perdido: nada foi submetido). **H1 CONFIRMADA** como causa primária, **agravada por gap real de alcance**: interações pending em hospedeiras `done` não aparecem em nenhuma superfície global; chips de issue em cards apenas navegam/prefetcham; aceite do card-guarda é confundível com resolução.
Correção de registro: o card fc4db135 (AID-1139) afirma "o board aceita seu clique mas não persiste" — **desmentido pela forense**; nenhum clique chegou ao servidor.

## Remediação + fix
- **Imediata (verificada, postada na AID-570):** 6 comentários do founder (AID-531/537/549/557/695/701) expiram as 7 confirmações como `superseded_by_comment`; AID-536: cancelar o ask_user_questions. Sem efeitos colaterais (path de comentário não enfileira wakeup; `queueResolvedInteractionContinuationWakeup` ignora issues fechadas).
- **Produto (delegado em child issue):** agregador/bulk resolver; aceite de card-guarda não deve ser confundível com resolução; deep-link do chip → card pending; affordance de que comentário do usuário supersede confirmações. Unblock owner: CEO → Paperclip (vendor).

**Founding Product Engineer** · 2026-09-09T23:13:19.644859+00:00

**Caminho mínimo VERIFICADO para o founder limpar as 8 interações stale** (tentativa de postar direto na AID-570 foi negada: fora do meu boundary de autorização — portanto registro aqui, canal que o founder abriu).

### Passo 1 — 7 das 8 de uma vez (só comentar)
Comente **qualquer coisa** (ex.: `superseded — ver AID-570`) nestas 6 issues. Comentário de **usuário** expira automaticamente as confirmações pending (`supersedeOnUserComment` → `expired/superseded_by_comment`, verificado no código da plataforma e nos payloads das 8):
- **AID-531** · **AID-537** · **AID-549** · **AID-557** · **AID-701** (1 interação cada) · **AID-695** (as 2 dela numa tacada)

### Passo 2 — a oitava
**AID-536**: abrir a issue → card de perguntas (ask_user_questions) → **cancelar** (ou responder).

Sem efeitos colaterais: caminho por comentário não enfileira wakeup de agentes e as issues permanecem `done`. Alternativa equivalente: o card `fc4db135` (AID-570) Opções 1 e 2 funcionam — apenas ignorar a frase "o board aceita seu clique mas não persiste" (incorreta; nenhum clique chegou ao servidor).

---
**Disposição AID-1132:** pedidos (1) forense e (2) auditoria entregues com evidência executável; (3) resolvido: H2-persistência descartada, H1 confirmada com agravante de alcance. Fix de produto delegado ao vendor via child **AID-1145** (assignee CEO, unblock owner CEO → Paperclip). Remediação imediata documentada acima. Fecho `done`.

---

