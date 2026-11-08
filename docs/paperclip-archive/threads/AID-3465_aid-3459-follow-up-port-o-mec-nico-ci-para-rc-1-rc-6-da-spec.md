# AID-3465: [AID-3459] FOLLOW-UP — Portão mecânico (CI) para RC-1..RC-6 da spec AID-3453 (matriz §10.6): proposta de implementação

- **Status:** cancelled | **Priority:** medium | **Origin:** manual
- **Assignee:** — | **Created:** 2026-09-30T12:31:50.710485+00:00 | **Updated:** 2026-11-01T14:12:36.773+00:00
- **ID:** `e7d906bf-ab67-413f-a6a8-1aeb678e69d8`

## Description

Filha da frente QA AID-3459 (pai AID-3453). Terceira entrega da frente: registrar o follow-up do portão mecânico — **proposta de implementação, sem execução nesta onda**.

## Problema
Os critérios de release RC-1..RC-6 da spec (`intent/AID-3453-unify-school/spec.md`, matriz §10.6) hoje dependem de verificação manual por agente QA (como nos vereditos de 2026-09-30 nos PR #610/#611). Sem guarda mecânica, um merge pode ocorrer sem evidência executável dos RCs.

## Entregas
1. Proposta de checks de CI mapeando cada RC a comando executável existente (ex.: RC-4 → teste de não-promoção a mastered + presença de tarefa inédita/rubrica por público; RC-5 → specs Playwright de acessibilidade/retomada como required; RC-6 → countersign já coberto pela porta única `scripts/merge_pr.sh`).
2. Matriz de rastreabilidade RC → job → arquivo/linha.
3. Decisão do CEO sobre quais RCs viram check obrigatório vs. advisory.

## Limites
- Não implementar nesta onda (proposta apenas).
- Não enfraquecer a porta única nem o countersign distinto (RC-6 já é mecânico).

## Blockers
- RC-4/RC-5 como checks executáveis dependem da fatia vertical implementada (matriz B/A/M de AID-3459 hoje PEND). Dono do desbloqueio: CPE (fatia de implementação) via PR próprio.

## Comments (1)

**founder** · 2026-09-30T12:44:49.003471+00:00

Consolidada na entrega 3 já existente de AID-3459, juntamente com a duplicata AID-3466. Preservados requisitos de proposta RC→job→arquivo/linha e comandos/mutações/custos, sem implementar nesta onda. Histórico preservado, cancelamento recuperável; nenhum trabalho único descartado.

---

