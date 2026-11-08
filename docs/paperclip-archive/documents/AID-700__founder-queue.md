<!-- issue: AID-700 | key: founder-queue | doc_id: 2b5d271f-fe49-4ae6-a91d-5df66d064566 | updated: 2026-09-03 01:13:37.63+00 -->

# AID-700 — Fila do Founder (board-only): 6 ações que destravam o board

(AID-700)

# AID-700 — Fila do Founder (board-only) — 6 ações que destravam o board

> Gerada pelo CEO em 2026-09-03 ~01:1xZ. Verificações first-hand nos PRs (read-only). Rotas de resolução de interação são board-only para agentes (confirmado 1ª-mão).

## Ações em ordem de impacto

| # | Issue | Card/Interação | Ação | Por quê (evidência CEO) |
|---|---|---|---|---|
| 1 | AID-554 | `6eb005b4` `confirmation:AID-554:policy-option` | **ACEITAR** → merge **PR #255** | Política **Opção B** ratificada CEO (trailer `SDLC-ALLOW-TEST-EDIT`/onda; sem allowlist). PR #255 MERGEABLE, docs-only +173/−0, checks all pass, QA GO (AID-692). |
| 2 | AID-539 | `b4fb2cf6` `confirmation:AID-539:merge-pr256:v1` | **ACEITAR** → merge **PR #256** | CI 36/36 (claims job roda o pytest do guard pela 1ª vez), causa-raiz fix (expectativas derivadas dos grants atuais), verificador GO, MERGEABLE. |
| 3 | AID-641 | `cf8b749c` ask_user_questions | **RESPONDER** 3 perguntas (canal, janela, incentivo) | Recrutamento O1 aberto pós-GO; zero participantes até resposta. Kit recomenda: rede do founder, ≤2 semanas, sem incentivo. |
| 4 | AID-699 | `26d4fc07` ask_user_questions | **RESPONDER** 3 decisões reservadas | Pre-escopo entregue (rev `15b39ede`). SD recomenda: (a) NÃO renomear mod-05 na janela; (b) O3-C2 gated §8.7, l30+ adiada até funil; (c) manter gate se OP-B inativo. |
| 5 | AID-570 | `b009c210` request_confirmation | **ACEITAR as 5 stale** (A5-F1) + decidir **A5-F2** | Nas 5, o desfecho autorizado JÁ ocorreu (superseded-by-execution). A5-F2: aceitar = CEO desliga `allow_force_pushes` via gh api com receipt; ou desligar na UI e rejeitar. |
| 6 | AID-701 | — | **REATRIBUIR ao FPE** `fa8130d5-e24f-4f98-8470-ccfeef17c6d5` + investigar `Agent not found` | ORDEM para FPE executar AID-695 pós-merges #255/#256 (test-only). Assign CEO→FPE rejeitado pela API; run do SD disparada por engano (espera-se no-op: ORDEM endereça FPE e exige pré-condição). |

## Estado do board (não requer ação)

- **AID-670** (janela 21d O3-C1): watchdog ativo `255989ed`; protocolo de descanso; próximo checkpoint **d+1 = 2026-09-03T17:16Z**.
- **AID-400**: âncora rolling do SDLC Scrum Master.
- **AID-695**: spec canônica do teste pickRandomShopId (execução governada pela ORDEM AID-701).

## Agentes

Nenhum agente novo necessário: o gargalo é atenção do founder em cards board-only, não capacidade do roster (CEO/SD/UX/CD/FPE/QA/SM).
