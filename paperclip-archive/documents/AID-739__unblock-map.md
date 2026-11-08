<!-- issue: AID-739 | key: unblock-map | doc_id: 37689fde-48ac-4ed4-b4e9-e62ba6d01fd0 | updated: 2026-09-03 18:20:06.599+00 -->

# Unblock Map — AID-739 (FINAL, rodada 2026-09-03)

(AID-739)

# Unblock Map — AID-739 (4ª ordem "Desbloqueio de próximas tarefas")

**CEO run 2026-09-03 ~18:0xZ.** Ordem do founder: entender objetivos, desbloquear próximas tarefas, delegar, criar agentes quando necessário.

## 1. Objetivos (confirmados, não re-perguntados)
Democratizar IA via lições curtas com ritmo Duolingo — trilha não-programador (LiteracyDojo, l01–l07 OP-B completa + promovida) e trilha dev. Sequência deliberada: **provar o loop do aluno (PILOTO P6) ANTES de expandir catálogo** — O3-C2 (+12 lições l08–l13) segue RESERVADA atrás do gate `docs/piloto/CRITERIO_O3C2.md` (G1–G5). Regra de congelamento: `APRENDIZADOS.md` §5.

## 2. Estado do board (varredura completa, 738 issues, 10 não-fechadas)
| Issue | Status | Diagnóstico | Ação desta rodada |
|---|---|---|---|
| AID-736 (high) | backlog | ORDEM QA pre-flight P6 presa desde 15:06Z — dispatch defect família AID-727 (sem assignee, sem wake). Pre-flight JÁ EXECUTADO pelo CEO (AID-737, receipts: DEPLOY_ATUAL @ `ec265fa`, smoke 8/8 PASS) — falta countersign QA + fechamento | **ORDEM AID-740** (child, QA Lead, high): countersign + fechar AID-736. Re-testes de boundary desta run: PATCH re-atribuição → 403; interaction accept → board-only |
| AID-670 | todo | Janela 21d O3-C1; **d+1 venceu 17:16Z** sem checkpoint às 18:0xZ; watchdog `255989ed` ativo mas confiabilidade questionável (família AID-727) | **ORDEM AID-741** (child, System Designer): executar/reconciliar d+1 (protocolo idempotente) |
| AID-641 (UX teste O1) | in_progress | **Espera saudável** — 3 revisões de produtividade (AID-697/715/730) = veredito SAUDÁVEL. Card `cf8b749c` (canal/janela/incentivo do recrutamento) pending desde 02/Sep 17:10Z | Nenhuma — não duplicar o pedido; wake_assignee ativo |
| AID-699 (SD pós-janela) | in_review | Entregável completo (doc `pre-scopo`) + CEO endorsement registrado (AID-703). Aguarda founder no card `26d4fc07` (decisões reservadas §8 não são sobrescritas pelo CEO) | Nenhuma — espera legítima |
| AID-727 (high, bug plataforma) | in_review | Bug do PAPERCLIP (task-watchdog self-retrigger) — não é do repo aidevschool. Triagem SM: ACEITAR + upstream + contenção (card `ad2475cf`) | Tentativa de accept nesta run → **403 board-only**. Segue founder |
| AID-570 (higiene do board) | blocked | 5 interações stale em issues done + flag force-push. Rota cancel/resolve = board-only (verificado novamente: 403) | Segue founder (1 varredura de cards) |
| AID-732 / AID-737 (ordens duplicatas) | blocked | Cópias da mesma ordem; cards `9aa50a05` (superseded) e `8419f040` (canônico) | Fora da minha boundary nesta run; fundador pode dispensar `9aa50a05` |
| AID-400 (âncora SM) | todo | Issue-âncora de registro rolling — por design | Nenhuma |

## 3. Delegações executadas NESTA rodada (evidence)
1. **AID-740** → QA Lead (high): countersign independente do pre-flight P6 + fechamento da AID-736 (workaround do dispatch defect via criação-atribuição, fluxo que dispara wake — comprovado pela própria AID-739).
2. **AID-741** → System Designer (medium): checkpoint d+1 da janela O3-C1 (vencido 17:16Z) — executar ou reconciliar; idempotente por protocolo.

## 4. Criar novos agentes? — **NÃO, nesta rodada** (avaliação explícita, ordem do founder)
Bench atual (6 idle + CEO): SM, QA Lead, FPE, System Designer, UX, Content Designer — cobre todo o trabalho agent-side visível. Os 4 gargalos reais são **humanos ou da plataforma**: (a) executar o PILOTO P6 (facilitador = FOUNDER por design — participantes reais, evidência não simulável por agentes); (b) parâmetros de recrutamento O1 (rede do founder, incentivo $); (c) cards board-only (interações); (d) fix do bug AID-727 (upstream paperclip). Criar agente para qualquer um deles seria make-work sem alavancagem. Reavaliar quando O3-C2 destravar (+12 lições = carga real para Content Designer).

## 5. Lista ÚNICA do founder (resposta rápida, cards já existem)
| # | Card | Pergunta | Recomendação CEO |
|---|---|---|---|
| 1 | `8419f040` (AID-737) | Executar PILOTO P6 (kit `docs/piloto/`) + I2 + triage AID-727 | **Executar o piloto esta semana** (G1 ≥3 participantes; pre-flight VERDE). I2: *Opcional — apenas registrar*. Triage: *Aceitar* |
| 2 | `cf8b749c` (AID-641) | Canal/janela/incentivo recrutamento O1 (n=5–8 devs) | Canal: sua rede + comunidades dev BR; janela: ≤16/Sep; incentivo: nenhum (registrar) |
| 3 | `26d4fc07` (AID-699) | Renome mod-05 + prioridade l30+ + steer O3-C2 | Confirmar recomendações CEO/SD (endorsement AID-703) |
| 4 | `ad2475cf` (AID-727) | Aceitar triage SM (upstream + contenção) | Aceitar |
| — | higiene | Dispensar: `9aa50a05`, `d6a28d7d`, `28e1640f`, `b009c210`/`9d4b638a` conforme AID-570 | Dispensar superseded |

## 6. Próximo wake
`children_completed` em AID-740/AID-741 → CEO consolida (fechamentos, verificação de dispatch do scheduler, disposition final). Se os children NÃO despacharem (família AID-727), a ordem vira `blocked` com owner founder/plataforma.


## 7. ESTADO FINAL (consolidação children_completed, 18:2xZ) — issue FECHADA `done`
| Item | Resultado |
|---|---|
| AID-740 (QA countersign) | **`done`** — veredito **VERDE**: deploy `ec265fa` reproduzido byte-idêntico (JS/CSS md5 conferidos), verificador l02 v3 LIVE fail-closed, pin 83/83 unit + 6/6 E2E |
| AID-736 (pre-flight preso) | **`done`** — fechada pela própria QA (18:18:36Z) com countersign publicado — gargalo high removido SEM clique do founder |
| AID-741 (SD checkpoint d+1) | **`done`** — checkpoint publicado na AID-670 (18:12:15Z); watchdog `255989ed` confirmado não-disparado (evidência família AID-727) |
| AID-742 | `in_progress` — higiene non-blocking que a QA derivou do countersign (leftover vite dev) — tem owner e run próprios |
| AID-732 (ordem duplicata) | **`cancelled`** — superseded; card `9aa50a05` dispensável |
| AID-737 | mantida `blocked` — inbox canônico das decisões do founder (card `8419f040`) |

**Follow-up conhecido (sem liveness desta issue):** d+7 da janela O3-C1 = **2026-09-09T17:16Z** — se o watchdog seguir sem disparar, usar o padrão ORDEM manual (AID-741) na próxima varredura CEO.

**Disposition final: `done`.** Tudo que era agent-side na ordem foi executado e verificado. O que resta é founder-side (§5: 4 cards, destaque PILOTO P6 — kit pronto, pre-flight VERDE com countersign QA) ou plataforma (AID-727).