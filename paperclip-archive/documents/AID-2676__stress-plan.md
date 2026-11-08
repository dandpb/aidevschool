<!-- issue: AID-2676 | key: stress-plan | doc_id: 00197a06-0773-4957-b879-c8e67e6b4467 | updated: 2026-09-26 01:53:34.938+00 -->

# FACTORY-STRESS — Programa de POCs de estresse

(AID-2676)

# FACTORY-STRESS — Programa de POCs de estresse da fábrica agente

**Origem:** ordem do dono em AID-2676 (2026-09-26): "depois da agentic factory done, coloca todos os agentes pra testarem ... fazerem pocs pra estressarem a solucao e conseguirmos aprimora-la por nossos usos e produtos".

## GO (condições de liberação)
O programa fica armado em `backlog`. O CEO libera (`GO`) quando:
1. **PR #527 merged** em `main` (exige countersign QA AID-2678 + Stage-2); e
2. **Confirmação do dono aceita** (interação `4422d17b` — escopo POC termina em PR/CI + merge humano).

No GO: umbrella e children viram `todo` + comentário GO em cada thread; o CEO acorda as issues.

## Estrutura
- **Umbrella AID-2681** (SDLC Scrum Master, high): coordenação por ondas, friction log (doc `friction-log`), conversão de achados em backlog de melhorias priorizadas, relatório final.
- **21 POCs** — um por agente restante, cada um com ângulo de stress distinto e receipt obrigatório (comandos/saídas, fricções com repro, ≥2 propostas de melhoria).

## Ondas
| Onda | Issues | Ângulo |
| --- | --- | --- |
| 1 (high) | AID-2682 QA Lead — quebrar P1–P5 (fault-injection) | adversarial |
| 1 | AID-2683 Platform & Release — promote→PR→merge, SHA órfão, rollback | esteira |
| 1 | AID-2684 Platform & CI — worktrees concorrentes, `.scratch/` sob carga, recursos | isolamento |
| 1 | AID-2685 Engine Hardening — SIGKILL por estação, resume idempotente, replay de ledger | crash-recovery |
| 1 | AID-2686 Verifier & Evidence — P3/P2 na prática, evidência insuficiente, tampered outputs | independência |
| 2 (medium) | AID-2687 Learning Engine — item real e2e, fricção de contrato | produto |
| 2 | AID-2688 Curriculum Content — volume Duolingo (≥10 lições), throughput em lote | produto |
| 2 | AID-2689 Curriculum Platform — integração fábrica × `intent/` existente | produto |
| 2 | AID-2690 Product Delivery — cycle time vs processo manual, ergonomia | produto |
| 2 | AID-2691 Engine Systems — mudança de infra interna | produto |
| 2 | AID-2692 Full-Stack — feature multi-camada, contratos dependentes | produto |
| 2 | AID-2693 Learner App & A11y — checks de a11y como prova custom | produto |
| 2 | AID-2694 Learner App — dev diário, RU do CLI | produto |
| 2 | AID-2695 Analytics — schema churn × P4 | produto |
| 2 | AID-2696 Growth Web — superfície de marketing | produto |
| 2 | AID-2697 Founding Product — item user-facing + visão de produto | produto |
| 2 | AID-2698 Docs & Readiness — prova não-código + field-guide final | produto |
| 2 | AID-2699 Content Designer — contrato usável por não-engenheiro | não-engenheiro |
| 2 | AID-2700 System Designer — decisão de arquitetura, spec drift pós-freeze | não-engenheiro |
| 2 | AID-2701 UX Designer — spec UX + usabilidade do loop | não-engenheiro |
| 2 | AID-2702 Growth & Recruiter — copy/posicionamento ponta-a-ponta | não-engenheiro |

Cobertura: 24/24 agentes (22 issues + CEO no gate + SM na umbrella).

## Saída do programa
1. Defeitos com repro → issues de correção na fábrica (priorizados por impacto × esforço).
2. Friction log consolidado (AID-2681) → melhorias de ergonomia.
3. Field-guide da fábrica (AID-2698) a partir dos achados.
4. Recomendação de item real para o 1º ciclo e2e em produção (segue aguardando escolha do dono — HTML §06).

## Limites globais
Worktree novo na base pós-merge; runtime só em `.scratch/factory/`; produtor ≠ verificador; produção intacta salvo escopo explícito; sem PII; zero custo externo.