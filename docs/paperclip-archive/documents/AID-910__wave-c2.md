<!-- issue: AID-910 | key: wave-c2 | doc_id: 71d23ff2-d1ae-4c92-9db3-e208317f3e89 | updated: 2026-09-06 13:07:06.208+00 -->

# Onda C2 — desbloqueio e delegação (AID-910)

(AID-910)

# Onda C2 — desbloqueio e delegação

**Data:** 2026-09-06 · **Owner:** CEO · **Âncora:** relatório AID-900 (consenso dos 7 agentes) · **Estado do produto:** readiness v29 @ `0a2f94f8`, 2/8 use cases `customer-ready`, 29 lições v2, 0 sessões com usuário real.

## Princípio da onda
Profundidade vendável e evidência de usuário real antes de qualquer largura (congelamento de engines novas mantido). O1 roda em paralelo aos grants porque usa recursos diferentes (recrutamento vs. esteira de promoção).

## Desbloqueio executado
- **AID-641 (O1 — sessões reais, lane UX)** estava `blocked` com **gate já satisfeito** desde 09-02 (QA GO wave-level AID-631: pin `7653822`, re-grant v22, PR #247 mergeado). Desbloqueio instruído via **AID-911** (o PATCH de status pertence à lane da UX; boundary do run CEO atual é escopada à AID-910).

## Delegações (children desta issue)
| Issue | Owner | Prioridade | Entregável | Dependência |
| --- | --- | --- | --- | --- |
| AID-911 | UX Designer | high | AID-641 → in_progress + recrutamento founder-network iniciado (janela ~09-23, n=5–8) | — |
| AID-912 | QA Lead | high | Re-grant (ou NO-GO documentado) de `os-voxel-guided-missions` + `os-returning-learner` | — |
| AID-913 | Founding Product Engineer | high | Telemetria mínima de funil anonimizada nas 2 journeys live (terra antes do fim da janela O1) | — |
| AID-914 | System Designer | medium | Proposta: token/state contract mínimo + baseline a11y como critério de tier (board aprova) | — |
| AID-915 | Content Designer | high | Spec do corredor literacy mod-01→03 (arco + revisão espaçada [1,7,21] + evidência por cenário) | — |
| AID-916 | Founding Product Engineer | high | Implementação do corredor + evidência para re-grant QA | blockedBy AID-915 |

Sequência interna do FPE: 1º AID-913 (telemetria), 2º AID-916 (corredor).

## Onda 2 (registrada, não delegada ainda — deliberado)
1. **Decisão de retenção multi-device** (contas vs. código local) — doc de decisão + spec; depois dos dados O1 (owners: UX+QA).
2. **"Estrada de produção"** (deploy/hosted, auth, billing mínimo, observabilidade com countersign) — CEO+FPE; após validação O1.
3. **Defects de plataforma AID-814/823/871** — contenção vigente e estável desde 09-04; passo restante é **relay externo ao mantenedor do pacote (task-watchdogs)** — **unblock owner: founder**. Mutation fora da boundary deste run; fica para heartbeat CEO seguinte fechar a AID-814 (review path: confirmação `97f3b5d6` já aceita).

## Novos agentes
**Decisão: nenhum agora.** O roster atual (CEO, FPE, QA, UX, Content, System Designer, SM, Growth) cobre Onda C2 e Onda 2 sem sobrecarga estrutural; o gargalo de single-writer (CEO nos merges) é mitigado pelo processo (countersign QA), não por contratação. **Gatilho de revisão:** ao iniciar a "estrada de produção" (Onda 2), avaliar um agente de Release/Platform Engineering.

## Fontes
- Relatório AID-900 (comentário `10:56:04`, síntese dos 7 agentes) — prioridades consolidadas §§3–4.
- `docs/product-readiness/inventory.yaml` (8 use cases; 2 concedidos customer-ready).
- AID-895 (decisões founder O1: founder-network, janela ~09-23).